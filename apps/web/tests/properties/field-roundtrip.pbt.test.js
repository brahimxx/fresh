// Feature: products-and-sales-improvements
// Task: 5.7 PBT for product field round-trip persistence
//
// Property 12: Round-trip persistence for product fields
// **Validates: Requirements 5.2, 6.10, 7.7, 14.2**
//
// For any well-formed POST/PUT body to `/api/products` /
// `/api/products/[productId]` whose `category_id` (when supplied) belongs
// to the same salon as the product, the GET response MUST be byte-equal
// to the input body after the documented normalisation:
//
//   - `name`               : trim → 1–255 chars stored verbatim
//   - `brand`              : undefined → unchanged ; null/'' /'   ' → null ;
//                             non-string non-null → 400 (rejected, never stored) ;
//                             else → trimmed string, 1–120 chars
//   - `image_url`          : undefined → unchanged ; null/'' → null ;
//                             non-string non-null → 400 ;
//                             else → string ≤ 500 chars, passed through verbatim
//   - `category_id`        : undefined → unchanged ; null/'' → null ;
//                             positive int that belongs to the same salon → stored ;
//                             else → 400
//   - `description`        : undefined → unchanged ; null → null ; pass-through
//   - `sku`, `barcode`     : trimmed nullable strings (empty after trim → null)
//   - `price`              : non-negative number with ≤ 2 decimals
//   - `cost_price`         : nullable, otherwise like `price`
//   - `stock_quantity`,
//     `low_stock_threshold`: non-negative integer
//   - `is_active`          : boolean → 0|1 ; 0|1 → identity
//
// Strategy
// ────────
// The route's pure validators (`validateBrand`, `validateImageUrl`,
// `validateCategoryId`, `validateName`, `validateNullableString`,
// `validatePrice`, `validateNonNegativeInt`, `validateBoolean`) are not
// exported. We replicate them here as a single `normaliseProductBody()`
// function that mirrors `src/app/api/products/[productId]/route.js`
// byte-for-byte (helper signatures and constants kept in sync). This
// keeps the PBT free of DB / Next-runtime imports while pinning the
// observable normalisation contract.
//
// We then model storage + GET as the identity over the normalised
// fields (the route's serialiser does `brand ?? null` and
// `image_url ?? null`, which is a no-op for already-normalised values).
// The property then becomes:
//
//   forall valid input body B:
//     read(write(B)) ≡ normalise(B)         -- present fields round-trip
//     read(write(B)).<unset> are unchanged   -- absent fields skip
//
// and the dual property: every `{ error }` branch leaves the row
// untouched (no partial write).

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { brandArb, productArb } from './_arbitraries.js';

// ─── Constants — kept in sync with the route handler ─────────────────────

const NAME_MAX = 255;
const BRAND_MAX = 120;
const SKU_MAX = 100;
const BARCODE_MAX = 100;
const IMAGE_URL_MAX = 500;
const PRICE_MAX_DECIMALS = 2;

const FIXED_SEED = 0xF1E1D700;

// ─── Inlined validators — byte-equal copies of the route helpers ─────────
// Source: src/app/api/products/[productId]/route.js (private helpers).

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function hasAtMostNDecimals(n, max) {
  return Number(n.toFixed(max)) === n;
}

function validateName(raw) {
  if (raw === undefined) return { skip: true };
  if (typeof raw !== 'string') return { error: 'name must be a string' };
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) {
    return { error: `name must be between 1 and ${NAME_MAX} characters` };
  }
  return { value: trimmed };
}

function validateBrand(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: 'brand must be a string or null' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > BRAND_MAX) return { error: 'brand too long' };
  return { value: trimmed };
}

function validateImageUrl(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: 'image_url must be a string or null' };
  if (raw.length === 0) return { value: null };
  if (raw.length > IMAGE_URL_MAX) return { error: 'image_url too long' };
  return { value: raw };
}

function validateCategoryId(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber <= 0) {
    return { error: 'category_id must be a positive integer or null' };
  }
  if (typeof raw === 'string' && String(asNumber) !== raw.trim()) {
    return { error: 'category_id must be a positive integer or null' };
  }
  return { value: asNumber };
}

function validateNullableString(raw, parameter, max) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: `${parameter} not string` };
  if (parameter === 'description') {
    if (raw.length > 65535) return { error: 'description too long' };
    return { value: raw };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > max) return { error: `${parameter} too long` };
  return { value: trimmed };
}

function validatePrice(raw, parameter, { allowNull = false } = {}) {
  if (raw === undefined) return { skip: true };
  if (raw === null) {
    return allowNull ? { value: null } : { error: `${parameter} is required` };
  }
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!isFiniteNumber(asNumber) || asNumber < 0) {
    return { error: `${parameter} must be non-negative` };
  }
  if (!hasAtMostNDecimals(asNumber, PRICE_MAX_DECIMALS)) {
    return { error: `${parameter} must have ≤ 2 decimals` };
  }
  return { value: asNumber };
}

function validateNonNegativeInt(raw, parameter) {
  if (raw === undefined) return { skip: true };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 0) {
    return { error: `${parameter} must be non-negative integer` };
  }
  return { value: asNumber };
}

function validateBoolean(raw, parameter) {
  if (raw === undefined) return { skip: true };
  if (typeof raw === 'boolean') return { value: raw ? 1 : 0 };
  if (raw === 0 || raw === 1) return { value: raw };
  return { error: `${parameter} must be boolean` };
}

/**
 * Normalise an input body the way the route handler does. Returns one of:
 *   - `{ ok: true, fields: { col -> normalisedValue } }` — only fields
 *     that were supplied appear; absent fields don't appear (skip).
 *   - `{ ok: false, parameter, error }` — first failing field.
 *
 * `category_id` is handled in two phases by the route: the validator
 * above checks shape, then a DB round-trip enforces same-salon ownership.
 * We model the same-salon check by accepting a `categoriesBySalon` map
 * `{ [categoryId]: salon_id }` and a target `salonId`.
 */
function normaliseProductBody(body, { categoriesBySalon = {}, salonId } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, parameter: 'body', error: 'invalid body' };
  }

  const checks = {
    name: validateName(body.name),
    description: validateNullableString(body.description, 'description'),
    brand: validateBrand(body.brand),
    sku: validateNullableString(body.sku, 'sku', SKU_MAX),
    barcode: validateNullableString(body.barcode, 'barcode', BARCODE_MAX),
    price: validatePrice(body.price, 'price'),
    cost_price: validatePrice(body.cost_price, 'cost_price', { allowNull: true }),
    stock_quantity: validateNonNegativeInt(body.stock_quantity, 'stock_quantity'),
    low_stock_threshold: validateNonNegativeInt(
      body.low_stock_threshold,
      'low_stock_threshold',
    ),
    is_active: validateBoolean(body.is_active, 'is_active'),
    image_url: validateImageUrl(body.image_url),
    category_id: validateCategoryId(body.category_id),
  };

  for (const [parameter, result] of Object.entries(checks)) {
    if (result.error) return { ok: false, parameter, error: result.error };
  }

  // Same-salon ownership for category_id (Requirement 6.10).
  if (!checks.category_id.skip && checks.category_id.value !== null) {
    const ownerSalon = categoriesBySalon[checks.category_id.value];
    if (ownerSalon == null || ownerSalon !== salonId) {
      return { ok: false, parameter: 'category_id', error: 'cross-salon' };
    }
  }

  const fields = {};
  for (const [parameter, result] of Object.entries(checks)) {
    if (!result.skip) fields[parameter] = result.value;
  }
  return { ok: true, fields };
}

/**
 * Model of the storage + GET round-trip. Applies the supplied normalised
 * fields to the existing row, then projects the row through the route's
 * `serialiseProduct` (which uses `?? null` for `brand` and `image_url`
 * — a no-op once values are normalised).
 */
function applyAndRead(existingRow, normalisedFields) {
  const updated = { ...existingRow, ...normalisedFields };
  return {
    id: updated.id,
    salon_id: updated.salon_id,
    category_id: updated.category_id ?? null,
    brand: updated.brand ?? null,
    name: updated.name,
    description: updated.description ?? null,
    price: updated.price,
    cost_price: updated.cost_price ?? null,
    sku: updated.sku ?? null,
    barcode: updated.barcode ?? null,
    stock_quantity: updated.stock_quantity,
    low_stock_threshold: updated.low_stock_threshold,
    is_active: updated.is_active,
    image_url: updated.image_url ?? null,
  };
}

// ─── Body generators — exercise the documented edge cases ────────────────

/** Brand subspace that is *always valid* after normalisation. */
const validBrandInputArb = fc.oneof(
  { weight: 4, arbitrary: brandArb },
  // Whitespace-only strings collapse to null per Requirement 5.5.
  { weight: 1, arbitrary: fc.constantFrom('   ', '\t', '\n', ' \t \n ') },
);

/** Image URL subspace that is *always valid* after normalisation. */
const validImageUrlArb = fc.oneof(
  { weight: 2, arbitrary: fc.constant(null) },
  { weight: 2, arbitrary: fc.constant('') },
  {
    weight: 4,
    arbitrary: fc
      .string({ minLength: 1, maxLength: 200 })
      .map((s) => `/uploads/products/${s}`),
  },
);

/** Generate a (possibly partial) PUT body with documented edge cases. */
function bodyArbForRow(row, sameSalonCategoryIds) {
  const sameSalonCategoryArb =
    sameSalonCategoryIds.length === 0
      ? fc.constant(null)
      : fc.oneof(
          { weight: 1, arbitrary: fc.constant(null) },
          { weight: 1, arbitrary: fc.constant('') },
          { weight: 4, arbitrary: fc.constantFrom(...sameSalonCategoryIds) },
        );

  return fc.record(
    {
      // Use `fc.option(..., { nil: undefined })` so each field is
      // independently present-or-absent, matching partial PUT semantics.
      name: fc.option(
        fc.string({ minLength: 1, maxLength: NAME_MAX }).filter(
          (s) => {
            const t = s.trim();
            return t.length >= 1 && t.length <= NAME_MAX;
          },
        ),
        { nil: undefined, freq: 2 },
      ),
      description: fc.option(
        fc.oneof(fc.string({ maxLength: 200 }), fc.constant(null)),
        { nil: undefined, freq: 2 },
      ),
      brand: fc.option(validBrandInputArb, { nil: undefined, freq: 2 }),
      sku: fc.option(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: SKU_MAX }).filter(
            (s) => s.trim().length > 0 && s.trim().length <= SKU_MAX,
          ),
          fc.constant(null),
          fc.constant(''),
        ),
        { nil: undefined, freq: 2 },
      ),
      barcode: fc.option(
        fc.oneof(
          fc
            .string({ minLength: 1, maxLength: BARCODE_MAX })
            .filter((s) => s.trim().length > 0 && s.trim().length <= BARCODE_MAX),
          fc.constant(null),
          fc.constant(''),
        ),
        { nil: undefined, freq: 2 },
      ),
      price: fc.option(
        fc.integer({ min: 0, max: 1_000_000_00 }).map((c) => c / 100),
        { nil: undefined, freq: 2 },
      ),
      cost_price: fc.option(
        fc.oneof(
          fc.integer({ min: 0, max: 1_000_000_00 }).map((c) => c / 100),
          fc.constant(null),
        ),
        { nil: undefined, freq: 2 },
      ),
      stock_quantity: fc.option(fc.nat({ max: 1_000_000 }), {
        nil: undefined,
        freq: 2,
      }),
      low_stock_threshold: fc.option(fc.nat({ max: 1_000 }), {
        nil: undefined,
        freq: 2,
      }),
      is_active: fc.option(
        fc.oneof(fc.boolean(), fc.constantFrom(0, 1)),
        { nil: undefined, freq: 2 },
      ),
      image_url: fc.option(validImageUrlArb, { nil: undefined, freq: 2 }),
      category_id: fc.option(sameSalonCategoryArb, {
        nil: undefined,
        freq: 2,
      }),
    },
    { withDeletedKeys: true },
  );
}

// A "row + categories" generator: a stored product plus a small set of
// categories on the same salon, and one category on a different salon
// (used by the cross-salon rejection property).
const rowAndCategoriesArb = productArb.chain((row) =>
  fc
    .record({
      sameSalonCategoryIds: fc.uniqueArray(fc.integer({ min: 1, max: 100_000 }), {
        minLength: 1,
        maxLength: 5,
      }),
      crossSalonCategoryId: fc.integer({ min: 100_001, max: 200_000 }),
      crossSalonId: fc
        .integer({ min: 1, max: 1_000_000 })
        .filter((id) => id !== row.salon_id),
    })
    .map(({ sameSalonCategoryIds, crossSalonCategoryId, crossSalonId }) => {
      const categoriesBySalon = {};
      for (const id of sameSalonCategoryIds) categoriesBySalon[id] = row.salon_id;
      categoriesBySalon[crossSalonCategoryId] = crossSalonId;
      return {
        row,
        sameSalonCategoryIds,
        crossSalonCategoryId,
        categoriesBySalon,
      };
    }),
);

// ─── Properties ──────────────────────────────────────────────────────────

describe('Property 12: round-trip persistence for product fields', () => {
  it('valid body: read(write(B)) is byte-equal to normalise(B) for every supplied field', () => {
    fc.assert(
      fc.property(
        rowAndCategoriesArb.chain(
          ({ row, sameSalonCategoryIds, categoriesBySalon }) =>
            bodyArbForRow(row, sameSalonCategoryIds).map((body) => ({
              row,
              body,
              categoriesBySalon,
            })),
        ),
        ({ row, body, categoriesBySalon }) => {
          const result = normaliseProductBody(body, {
            categoriesBySalon,
            salonId: row.salon_id,
          });

          // The generator only emits valid bodies, so normalisation must
          // always succeed on this branch. If it fails, the generator is
          // broken — surface that as a hard failure.
          expect(result.ok).toBe(true);

          const after = applyAndRead(row, result.fields);

          // For every key the body supplied, the read-back value MUST
          // equal the normalised value (byte-equality). For keys absent
          // from the body, the read-back value MUST equal the row's
          // pre-existing value (skip semantics).
          for (const [key, normalised] of Object.entries(result.fields)) {
            expect(after[key]).toStrictEqual(normalised);
          }
          for (const key of [
            'name',
            'description',
            'brand',
            'sku',
            'barcode',
            'price',
            'cost_price',
            'stock_quantity',
            'low_stock_threshold',
            'is_active',
            'image_url',
            'category_id',
          ]) {
            if (!(key in result.fields)) {
              // Absent: row state is preserved (after `?? null` projection).
              const expected = applyAndRead(row, {})[key];
              expect(after[key]).toStrictEqual(expected);
            }
          }
          // Identity columns are never mutated.
          expect(after.id).toBe(row.id);
          expect(after.salon_id).toBe(row.salon_id);
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('brand: null, empty, and whitespace-only inputs all collapse to SQL NULL', () => {
    fc.assert(
      fc.property(
        productArb,
        fc.constantFrom(null, '', ' ', '   ', '\t', '\n', ' \t \n '),
        (row, brandInput) => {
          const result = normaliseProductBody(
            { brand: brandInput },
            { salonId: row.salon_id },
          );
          expect(result.ok).toBe(true);
          expect(result.fields.brand).toBeNull();
          expect(applyAndRead(row, result.fields).brand).toBeNull();
        },
      ),
      { seed: FIXED_SEED, numRuns: 100 },
    );
  });

  it('brand: trimmed value (1–120 chars) round-trips byte-equal', () => {
    const trimmedBrandArb = brandArb.filter(
      (b) =>
        typeof b === 'string' &&
        b.trim().length >= 1 &&
        b.trim().length <= BRAND_MAX,
    );
    fc.assert(
      fc.property(productArb, trimmedBrandArb, (row, brandInput) => {
        const result = normaliseProductBody(
          { brand: brandInput },
          { salonId: row.salon_id },
        );
        expect(result.ok).toBe(true);
        expect(result.fields.brand).toBe(brandInput.trim());
        expect(applyAndRead(row, result.fields).brand).toBe(brandInput.trim());
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('image_url: null and "" both collapse to SQL NULL; non-empty strings pass through verbatim', () => {
    fc.assert(
      fc.property(productArb, validImageUrlArb, (row, imageInput) => {
        const result = normaliseProductBody(
          { image_url: imageInput },
          { salonId: row.salon_id },
        );
        expect(result.ok).toBe(true);
        const expected = imageInput === '' || imageInput === null ? null : imageInput;
        expect(result.fields.image_url).toStrictEqual(expected);
        expect(applyAndRead(row, result.fields).image_url).toStrictEqual(expected);
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('category_id: same-salon id round-trips; "" and null collapse to NULL', () => {
    fc.assert(
      fc.property(rowAndCategoriesArb, ({ row, sameSalonCategoryIds, categoriesBySalon }) => {
        for (const cid of [...sameSalonCategoryIds, null, '']) {
          const result = normaliseProductBody(
            { category_id: cid },
            { categoriesBySalon, salonId: row.salon_id },
          );
          expect(result.ok).toBe(true);
          const expected = cid === '' || cid === null ? null : cid;
          expect(result.fields.category_id).toStrictEqual(expected);
          expect(applyAndRead(row, result.fields).category_id).toStrictEqual(expected);
        }
      }),
      { seed: FIXED_SEED, numRuns: 100 },
    );
  });

  it('category_id: cross-salon id is rejected and never persisted (Requirement 6.10)', () => {
    fc.assert(
      fc.property(
        rowAndCategoriesArb,
        ({ row, crossSalonCategoryId, categoriesBySalon }) => {
          const result = normaliseProductBody(
            { name: 'Probe', category_id: crossSalonCategoryId },
            { categoriesBySalon, salonId: row.salon_id },
          );
          expect(result.ok).toBe(false);
          expect(result.parameter).toBe('category_id');
          // No partial write: the row is unchanged after a rejected body.
          const after = applyAndRead(row, {});
          expect(after.category_id).toBe(row.category_id ?? null);
          expect(after.name).toBe(row.name);
        },
      ),
      { seed: FIXED_SEED, numRuns: 100 },
    );
  });

  it('absent fields are skipped: empty body leaves every column unchanged', () => {
    fc.assert(
      fc.property(productArb, (row) => {
        const result = normaliseProductBody({}, { salonId: row.salon_id });
        expect(result.ok).toBe(true);
        expect(result.fields).toEqual({});
        // Round-trip the empty body: the read-back row MUST byte-equal the
        // pre-write row (under the documented `?? null` projection).
        const before = applyAndRead(row, {});
        const after = applyAndRead(row, result.fields);
        expect(after).toStrictEqual(before);
      }),
      { seed: FIXED_SEED, numRuns: 100 },
    );
  });

  it('name: trimmed string round-trips byte-equal (Requirement 14.2 trimming convention)', () => {
    const paddedNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)
      .map((s) => `   ${s}   `);
    fc.assert(
      fc.property(productArb, paddedNameArb, (row, nameInput) => {
        const result = normaliseProductBody(
          { name: nameInput },
          { salonId: row.salon_id },
        );
        expect(result.ok).toBe(true);
        expect(result.fields.name).toBe(nameInput.trim());
        expect(applyAndRead(row, result.fields).name).toBe(nameInput.trim());
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('numeric fields: price, cost_price, stock_quantity, low_stock_threshold round-trip without rounding drift', () => {
    fc.assert(
      fc.property(
        productArb,
        fc.integer({ min: 0, max: 1_000_000_00 }).map((c) => c / 100),
        fc.oneof(
          fc.integer({ min: 0, max: 1_000_000_00 }).map((c) => c / 100),
          fc.constant(null),
        ),
        fc.nat({ max: 1_000_000 }),
        fc.nat({ max: 1_000 }),
        (row, price, costPrice, stockQty, lowThreshold) => {
          const body = {
            price,
            cost_price: costPrice,
            stock_quantity: stockQty,
            low_stock_threshold: lowThreshold,
          };
          const result = normaliseProductBody(body, { salonId: row.salon_id });
          expect(result.ok).toBe(true);
          const after = applyAndRead(row, result.fields);
          expect(after.price).toBe(price);
          expect(after.cost_price).toStrictEqual(costPrice);
          expect(after.stock_quantity).toBe(stockQty);
          expect(after.low_stock_threshold).toBe(lowThreshold);
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('is_active: boolean inputs persist as 0|1; 0|1 are identity', () => {
    fc.assert(
      fc.property(
        productArb,
        fc.oneof(fc.boolean(), fc.constantFrom(0, 1)),
        (row, raw) => {
          const result = normaliseProductBody(
            { is_active: raw },
            { salonId: row.salon_id },
          );
          expect(result.ok).toBe(true);
          const expected = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw;
          expect(result.fields.is_active).toBe(expected);
          expect(applyAndRead(row, result.fields).is_active).toBe(expected);
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });
});

// ─── Pinned drift-detection table ────────────────────────────────────────
// A small fixed table of inputs and expected normalised outputs. If the
// route handler's validators ever drift away from the contract above,
// these examples will fail before the property tests do, making the
// regression easier to localise.

describe('Property 12: pinned normalisation table', () => {
  const cases = [
    // [body, expectedFields]
    [{ brand: null }, { brand: null }],
    [{ brand: '' }, { brand: null }],
    [{ brand: '   ' }, { brand: null }],
    [{ brand: 'L\u2019Oréal' }, { brand: 'L\u2019Oréal' }],
    [{ brand: '  KÉRASTASE  ' }, { brand: 'KÉRASTASE' }],
    [{ image_url: null }, { image_url: null }],
    [{ image_url: '' }, { image_url: null }],
    [{ image_url: '/uploads/products/abc.jpg' }, { image_url: '/uploads/products/abc.jpg' }],
    [{ category_id: null }, { category_id: null }],
    [{ category_id: '' }, { category_id: null }],
    [{ name: '  Shampoo  ' }, { name: 'Shampoo' }],
    [{ description: null }, { description: null }],
    [{ description: '' }, { description: '' }], // description preserves empty string
    [{ sku: '' }, { sku: null }],
    [{ sku: '  SKU-1  ' }, { sku: 'SKU-1' }],
    [{ is_active: true }, { is_active: 1 }],
    [{ is_active: false }, { is_active: 0 }],
    [{ is_active: 1 }, { is_active: 1 }],
    [{ is_active: 0 }, { is_active: 0 }],
    [{ price: 9.9 }, { price: 9.9 }],
    [{ cost_price: null }, { cost_price: null }],
    [{ stock_quantity: 0 }, { stock_quantity: 0 }],
  ];

  it.each(cases)('normalises %j to %j', (body, expected) => {
    const result = normaliseProductBody(body, { salonId: 1 });
    expect(result.ok).toBe(true);
    expect(result.fields).toStrictEqual(expected);
  });

  it('rejects brand longer than 120 chars after trim', () => {
    const result = normaliseProductBody(
      { brand: 'A'.repeat(121) },
      { salonId: 1 },
    );
    expect(result.ok).toBe(false);
    expect(result.parameter).toBe('brand');
  });

  it('rejects non-string non-null brand', () => {
    const result = normaliseProductBody({ brand: 42 }, { salonId: 1 });
    expect(result.ok).toBe(false);
    expect(result.parameter).toBe('brand');
  });

  it('rejects image_url longer than 500 chars', () => {
    const result = normaliseProductBody(
      { image_url: 'x'.repeat(501) },
      { salonId: 1 },
    );
    expect(result.ok).toBe(false);
    expect(result.parameter).toBe('image_url');
  });

  it('rejects cross-salon category_id', () => {
    const result = normaliseProductBody(
      { category_id: 99 },
      { categoriesBySalon: { 99: 2 }, salonId: 1 },
    );
    expect(result.ok).toBe(false);
    expect(result.parameter).toBe('category_id');
  });

  it('rejects unknown category_id (no row in categoriesBySalon)', () => {
    const result = normaliseProductBody(
      { category_id: 9999 },
      { categoriesBySalon: {}, salonId: 1 },
    );
    expect(result.ok).toBe(false);
    expect(result.parameter).toBe('category_id');
  });
});
