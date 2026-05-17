// Feature: products-and-sales-improvements
//
// Property 18: Currency consistency across Products & Sales surfaces
// Validates: Requirements 18.4, 19.1, 19.2, 19.3, 19.4, 19.5
//
// This file pins the *pure formatting contract* exposed by
// `src/lib/format.js#formatCurrency(amount, currency)`. Every monetary
// render on Products_Page, Sales_Page, PaymentDetailDialog, RefundDialog,
// and the receipt view goes through that one function with
// `salon.currency` as the second argument (see design § 13 "Currency
// consistency"). Pinning the function's output guarantees that:
//
//   1. Whatever string the UI emits, it actually contains the salon's
//      currency marker (symbol for USD/EUR/GBP, code for DZD/JPY/CAD/...).
//      The single-argument shape `formatCurrency(amount)` is forbidden by
//      Requirements 19.1–19.3, so the *contract under test* is always
//      "two-argument, currency-aware".
//
//   2. The RefundDialog partial-amount prefix — derived by stripping
//      digits, decimal/group separators, and whitespace from
//      `formatCurrency(0, salon.currency)` (Requirement 19.4) — is
//      always a non-empty currency-marker string. The literal `$` is
//      forbidden as a hardcoded prefix; this property guarantees the
//      replacement is well-defined for every currency the salon may use.
//
//   3. Two different currencies, given the same amount, never collide
//      on output. This is what makes the "currency consistency" claim
//      observable: a missing second argument would silently fall back
//      to DZD and produce a string visibly different from the salon's
//      actual currency.
//
// The test is *pure-model*: it only imports `formatCurrency` from
// `@/lib/format` and `CURRENCY_CODES` from the shared arbitraries. No
// React, no DB, no network — drift between this file and the function's
// behaviour will be caught the moment the contract changes.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { formatCurrency } from '@/lib/format.js';
import { CURRENCY_CODES, moneyArb } from './_arbitraries.js';

const FIXED_SEED = 0xC0FFEE; // deterministic CI seed

// Currency-code arbitrary drawn from the dashboard's representative set.
const currencyArb = fc.constantFrom(...CURRENCY_CODES);

/**
 * Expected per-currency marker. Mirrors `formatCurrency()`'s two
 * branches: USD/EUR/GBP go through `Intl.NumberFormat` with `style:
 * 'currency'` (symbol output), every other code falls through to
 * `<number> CODE`.
 *
 * Kept as a literal so the property test detects either a code-list
 * change in `format.js` or a regression in the symbol mapping.
 */
const EXPECTED_MARKER = Object.freeze({
  USD: '$',
  EUR: '€',
  GBP: '£',
  DZD: 'DZD',
  JPY: 'JPY',
  CAD: 'CAD',
});

// ---------------------------------------------------------------------------
// Property 18.a — every render contains the currency's symbol or code
// ---------------------------------------------------------------------------

describe('Property 18: Currency consistency across Products & Sales surfaces', () => {
  it('formatCurrency(amount, currency) always contains the currency symbol or code', () => {
    fc.assert(
      fc.property(moneyArb, currencyArb, (amount, currency) => {
        const out = formatCurrency(amount, currency);

        // Output is always a non-empty string.
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);

        // The currency marker (symbol for symbol-currencies, ISO code
        // otherwise) MUST be present somewhere in the rendered string.
        // This is the property the UI relies on so a salon's currency
        // is visibly identifiable in every monetary cell.
        const marker = EXPECTED_MARKER[currency];
        expect(out).toContain(marker);
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 18.b — RefundDialog prefix derivation is always well-defined
  // -------------------------------------------------------------------------

  it('formatCurrency(0, currency) yields a non-empty prefix after stripping digits/separators/whitespace', () => {
    // RefundDialog computes its input prefix as
    //   formatCurrency(0, salon.currency).replace(/[\d.,\s]/g, '')
    // (design § 13, Requirement 19.4). The literal `$` is forbidden as
    // a hardcoded prefix, so the *derived* prefix MUST be non-empty for
    // every currency the salon may use — otherwise the input would
    // render with no prefix at all.
    fc.assert(
      fc.property(currencyArb, (currency) => {
        const zero = formatCurrency(0, currency);
        const prefix = zero.replace(/[\d.,\s]/g, '');

        expect(prefix.length).toBeGreaterThan(0);

        // The derived prefix MUST equal the currency's expected marker.
        // (For USD/EUR/GBP this is the symbol; for DZD/JPY/CAD it is
        // the ISO code that `formatCurrency` appends.) The literal `$`
        // is only allowed as the prefix for USD — never as a hardcoded
        // fallback for DZD, EUR, GBP, JPY, or CAD.
        expect(prefix).toBe(EXPECTED_MARKER[currency]);

        if (currency !== 'USD') {
          expect(prefix).not.toBe('$');
        }
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 18.c — different currencies never collide on the same amount
  // -------------------------------------------------------------------------

  it('different currencies produce different output for the same amount', () => {
    // This is the property that catches the "missing second argument"
    // bug: if a call site silently falls back to the DZD default, its
    // output would equal `formatCurrency(amount, 'DZD')` rather than
    // `formatCurrency(amount, salon.currency)` — which, for any non-DZD
    // salon, this property guarantees is a *visibly different string*.
    fc.assert(
      fc.property(
        moneyArb,
        currencyArb,
        currencyArb,
        (amount, a, b) => {
          fc.pre(a !== b);
          const outA = formatCurrency(amount, a);
          const outB = formatCurrency(amount, b);
          expect(outA).not.toBe(outB);
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Drift detection — pin the marker table against a small fixed set so a
// future change to `formatCurrency` (e.g. swapping `Intl` locales or
// adding a new symbol-currency) can't quietly break the UI's currency
// rendering without flagging this file.
// ---------------------------------------------------------------------------

describe('Property 18: pinned marker table', () => {
  const cases = [
    // [currency, zeroOutput, prefixAfterStrip]
    ['USD', '$0.00', '$'],
    ['EUR', '€0.00', '€'],
    ['GBP', '£0.00', '£'],
    ['DZD', '0 DZD', 'DZD'],
    ['JPY', '0 JPY', 'JPY'],
    ['CAD', '0 CAD', 'CAD'],
  ];

  it.each(cases)(
    'formatCurrency(0, %p) === %p; stripped prefix === %p',
    (currency, expectedZero, expectedPrefix) => {
      const zero = formatCurrency(0, currency);
      expect(zero).toBe(expectedZero);
      expect(zero.replace(/[\d.,\s]/g, '')).toBe(expectedPrefix);
    },
  );
});
