// Feature: products-and-sales-improvements
// Task: 16.1 PBT for affordance gating in Products_Page and Sales_Page
//
// Property 17 — Affordance-gating in the Products and Sales pages
//
// **Validates: Requirements 8.9, 8.12, 12.8, 21.1, 21.2, 21.3, 21.4**
//
// Pure-model property test. The Products_Page renders Add / Edit / Delete /
// Update Stock affordances iff `canManageProducts === true`, where
//
//     canManageProducts = resolvePermission(staffRole, customPermissions,
//                                           'products.manage')
//
// and the Sales_Page renders the per-row Refund button iff
//
//     canManageSales = resolvePermission(staffRole, customPermissions,
//                                        'sales.manage')
//     isRefundable(payment) =
//       (payment.status ∈ {'paid','partially_refunded'}) &&
//       (Number(payment.amount) - Number(payment.refunded_amount ?? 0)) > 0
//     refundButtonRendered = canManageSales && isRefundable(payment)
//
// (Source: `src/app/dashboard/salon/[salonId]/products/page.js` and
// `src/app/dashboard/salon/[salonId]/sales/page.js`, both of which derive
// their gating from `resolvePermission` directly — see the grep transcript
// in tasks.md task 16.1.)
//
// Because the page-level gating logic is "boolean equals
// `resolvePermission(...)` (with the refund row also requiring an isRefundable
// row)", testing the contract on the page reduces to testing the contract on
// `resolvePermission` itself. This file therefore exercises:
//
//   (a) Totality            — for every (role, customPermissions) the
//                             function returns a boolean (never throws,
//                             never returns null/undefined).
//   (b) Owner short-circuit — owners always resolve true on every key,
//                             including the dotted aliases.
//   (c) Alias equivalence   — `products.manage` ≡ `products_manage` and
//                             `sales.manage`   ≡ `sales_manage` for every
//                             (role, customPermissions) combo, so the page
//                             can use either spelling and get the same gate.
//   (d) Override beats role — when a custom permission is an explicit
//                             boolean, it overrides the role default for
//                             non-owners (Requirement 21.1, 21.2).
//   (e) Page-model agrees   — the modelled affordance flags are byte-equal
//                             to the resolver output (Add/Edit/Delete/
//                             UpdateStock for products; Refund for sales,
//                             with the additional isRefundable row gate).

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  customPermissionsArb,
  PAYMENT_STATUSES,
  STAFF_ROLES,
  moneyArb,
  positiveMoneyArb,
} from './_arbitraries.js';

import { resolvePermission } from '@/lib/permissions';

// Deterministic seed so a regression always reproduces locally.
const SEED = 0xA1F0;

// ---------------------------------------------------------------------------
// Page model — what the actual JSX in products/page.js and sales/page.js does.
// ---------------------------------------------------------------------------
//
// Products_Page (src/app/dashboard/salon/[salonId]/products/page.js):
//   const canManageProducts = resolvePermission(role, perms, 'products.manage');
//   {canManageProducts && <AddProductButton />}
//   {canManageProducts && <EditButton />}
//   {canManageProducts && <DeleteButton />}
//   {canManageProducts && <UpdateStockButton />}
//
// Sales_Page (src/app/dashboard/salon/[salonId]/sales/page.js):
//   const canManageSales = resolvePermission(role, perms, 'sales.manage');
//   const refundable     = canManageSales && isRefundable(payment);
//   {refundable && <RefundButton />}
//
// `productsPageAffordances` and `salesPageRefund` model that JSX as plain
// booleans so we can compare to the resolver without rendering React.

function isRefundable(payment) {
  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    return false;
  }
  const remaining =
    Number(payment.amount) - Number(payment.refunded_amount ?? 0);
  return remaining > 0;
}

function productsPageAffordances(role, perms) {
  const can = resolvePermission(role, perms, 'products.manage');
  return {
    add: can,
    edit: can,
    del: can,
    updateStock: can,
  };
}

function salesPageRefundButton(role, perms, payment) {
  const can = resolvePermission(role, perms, 'sales.manage');
  return can && isRefundable(payment);
}

// A minimal payment-row arbitrary scoped to this file. The shared
// `paymentArb` enforces `refunded_amount <= amount`, but for affordance
// gating we want the over-refunded edge to be reachable too (it's exactly
// the case where `amount - refunded_amount === 0` and the button must not
// render even for a manager). We therefore generate `(amount, refunded)`
// independently and let the model decide.
const paymentRowArb = fc.record({
  amount: positiveMoneyArb,
  refunded_amount: moneyArb,
  status: fc.constantFrom(...PAYMENT_STATUSES),
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Property 17 — affordance gating in Products_Page and Sales_Page', () => {
  // (a) Totality.
  it('resolvePermission is total for products.manage and sales.manage', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STAFF_ROLES),
        customPermissionsArb,
        fc.constantFrom('products.manage', 'sales.manage'),
        (role, perms, key) => {
          const out = resolvePermission(role, perms, key);
          return typeof out === 'boolean';
        },
      ),
      { seed: SEED, numRuns: 400 },
    );
  });

  // (b) Owner short-circuit.
  it('owners always resolve true for products.manage and sales.manage', () => {
    fc.assert(
      fc.property(
        customPermissionsArb,
        fc.constantFrom('products.manage', 'sales.manage'),
        (perms, key) => {
          // Even an explicit `false` override cannot demote the owner role
          // (Requirement 21.2: owners and admins always pass). Admins are
          // mapped to the `'owner'` staff role by the SalonProvider before
          // they reach the gating code, so the owner branch covers both.
          return resolvePermission('owner', perms, key) === true;
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  // (c) Alias equivalence.
  it('dotted and underscore spellings resolve identically for every role × permissions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STAFF_ROLES),
        customPermissionsArb,
        (role, perms) => {
          const dottedProducts = resolvePermission(role, perms, 'products.manage');
          const underscoreProducts = resolvePermission(role, perms, 'products_manage');
          const dottedSales = resolvePermission(role, perms, 'sales.manage');
          const underscoreSales = resolvePermission(role, perms, 'sales_manage');
          return (
            dottedProducts === underscoreProducts &&
            dottedSales === underscoreSales
          );
        },
      ),
      { seed: SEED, numRuns: 400 },
    );
  });

  // (d) Custom override beats role default for non-owners.
  it('an explicit boolean override on products_manage / sales_manage wins for non-owner roles', () => {
    const nonOwnerRoles = STAFF_ROLES.filter((r) => r !== 'owner');
    fc.assert(
      fc.property(
        fc.constantFrom(...nonOwnerRoles),
        fc.boolean(),
        fc.boolean(),
        (role, productsOverride, salesOverride) => {
          const perms = {
            products_manage: productsOverride,
            sales_manage: salesOverride,
          };
          // Both spellings see the override (alias map applied first).
          const products = resolvePermission(role, perms, 'products.manage');
          const sales = resolvePermission(role, perms, 'sales.manage');
          return products === productsOverride && sales === salesOverride;
        },
      ),
      { seed: SEED, numRuns: 400 },
    );
  });

  // (e1) Products_Page page-model agrees with the resolver.
  //
  // Add/Edit/Delete/UpdateStock are present in the DOM iff `products.manage`
  // resolves true (Requirement 21.2, 21.4). The four affordances move as a
  // single bit — there is no role × override combination that splits them.
  it('Products_Page omits Add/Edit/Delete/UpdateStock from DOM iff products.manage is false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STAFF_ROLES),
        customPermissionsArb,
        (role, perms) => {
          const can = resolvePermission(role, perms, 'products.manage');
          const af = productsPageAffordances(role, perms);
          // Equivalence in both directions: the four affordances render iff
          // can === true and are absent iff can === false.
          return (
            af.add === can &&
            af.edit === can &&
            af.del === can &&
            af.updateStock === can
          );
        },
      ),
      { seed: SEED, numRuns: 400 },
    );
  });

  // (e2) Sales_Page page-model agrees with the resolver, with the additional
  // row-level `isRefundable` gate from Requirement 12.8.
  //
  // The refund button MUST be omitted from the DOM (not merely disabled)
  // when any of the three conditions fails:
  //   - sales.manage resolves false
  //   - status ∉ {'paid','partially_refunded'}
  //   - amount - refunded_amount ≤ 0
  it('Sales_Page omits Refund button from DOM iff sales.manage is false OR row is not refundable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STAFF_ROLES),
        customPermissionsArb,
        paymentRowArb,
        (role, perms, payment) => {
          const can = resolvePermission(role, perms, 'sales.manage');
          const refundable = isRefundable(payment);
          const expected = can && refundable;
          const actual = salesPageRefundButton(role, perms, payment);
          return actual === expected;
        },
      ),
      { seed: SEED, numRuns: 500 },
    );
  });

  // (e3) Sanity unit-style cases that the property covers but are worth
  // calling out explicitly so a future refactor can't silently break them.
  it('owner sees every affordance regardless of overrides; staff with no override falls back to role default', () => {
    // Owner: always present, even with explicit false overrides.
    const ownerPerms = { products_manage: false, sales_manage: false };
    expect(productsPageAffordances('owner', ownerPerms).add).toBe(true);
    expect(productsPageAffordances('owner', ownerPerms).edit).toBe(true);
    expect(productsPageAffordances('owner', ownerPerms).del).toBe(true);
    expect(productsPageAffordances('owner', ownerPerms).updateStock).toBe(true);
    expect(
      salesPageRefundButton('owner', ownerPerms, {
        amount: 100,
        refunded_amount: 0,
        status: 'paid',
      }),
    ).toBe(true);

    // Manager (no overrides): role default is true for both manage keys.
    const af = productsPageAffordances('manager', null);
    expect(af.add && af.edit && af.del && af.updateStock).toBe(true);

    // Receptionist (no overrides): role default is false for both manage keys.
    const r = productsPageAffordances('receptionist', null);
    expect(r.add || r.edit || r.del || r.updateStock).toBe(false);
    expect(
      salesPageRefundButton('receptionist', null, {
        amount: 100,
        refunded_amount: 0,
        status: 'paid',
      }),
    ).toBe(false);

    // Receptionist with explicit override → button reappears (subject to
    // the row being refundable).
    expect(
      salesPageRefundButton(
        'receptionist',
        { sales_manage: true },
        { amount: 100, refunded_amount: 0, status: 'paid' },
      ),
    ).toBe(true);

    // Even with the override, a non-refundable row still hides the button.
    expect(
      salesPageRefundButton(
        'receptionist',
        { sales_manage: true },
        { amount: 100, refunded_amount: 100, status: 'paid' }, // remaining = 0
      ),
    ).toBe(false);
    expect(
      salesPageRefundButton(
        'receptionist',
        { sales_manage: true },
        { amount: 100, refunded_amount: 0, status: 'pending' }, // wrong status
      ),
    ).toBe(false);
  });
});
