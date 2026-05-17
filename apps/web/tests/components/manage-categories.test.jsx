/**
 * Component tests for `<ManageCategoriesDialog>` (Task 17.9).
 *
 * Covers Requirement 6.7 — manage product categories from a single dialog:
 *   - Renders the list returned by `useProductCategories`.
 *   - Create button calls `useCreateProductCategory.mutate` with the
 *     **trimmed** name and a salon-scoped payload.
 *   - Inline rename calls `useUpdateProductCategory.mutate` with the new
 *     trimmed name.
 *   - Up / down reorder buttons swap `display_order` by calling
 *     `useUpdateProductCategory.mutate` for the moved row first, then for
 *     its neighbour (chained inside `onSuccess`).
 *   - Delete button surfaces a confirmation, and only after confirming
 *     does it invoke `useDeleteProductCategory.mutate` with the row id.
 *
 * Strategy:
 *   - Mock `@/hooks/use-product-categories` so each hook returns a stub
 *     object whose `mutate` is a `vi.fn()` we can assert on.
 *   - Mock `sonner` so the component's toast calls are no-ops in jsdom.
 *   - Polyfill the small handful of DOM APIs Radix Dialog / ScrollArea
 *     poke at but jsdom does not implement (`ResizeObserver`,
 *     `hasPointerCapture`, `scrollIntoView`).
 *   - Use `fireEvent` from `@testing-library/react` (the project does not
 *     depend on `@testing-library/user-event`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';

// ---------------------------------------------------------------------------
// jsdom polyfills required by Radix-based Dialog / ScrollArea
// ---------------------------------------------------------------------------
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    // Radix Dialog calls hasPointerCapture during focus management.
    Element.prototype.hasPointerCapture = function () { return false; };
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
}

// ---------------------------------------------------------------------------
// Module mocks (declared before component import so vi.mock hoisting works)
// ---------------------------------------------------------------------------

// Quiet sonner so toast calls inside the component are no-ops under jsdom.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// Per-test override knobs for the categories query result.
const useProductCategoriesMock = vi.fn();

// Mutation stubs — recreated in beforeEach() so each test starts clean.
let createMutationStub;
let updateMutationStub;
let deleteMutationStub;

vi.mock('@/hooks/use-product-categories', () => ({
  useProductCategories: (salonId) => useProductCategoriesMock(salonId),
  useCreateProductCategory: () => createMutationStub,
  useUpdateProductCategory: () => updateMutationStub,
  useDeleteProductCategory: () => deleteMutationStub,
}));

// ---------------------------------------------------------------------------
// Fixtures and helpers
// ---------------------------------------------------------------------------

const SALON_ID = 7;

const CATEGORIES = [
  { id: 11, salon_id: SALON_ID, name: 'Hair Care', display_order: 0 },
  { id: 22, salon_id: SALON_ID, name: 'Skin Care', display_order: 1 },
  { id: 33, salon_id: SALON_ID, name: 'Tools', display_order: 2 },
];

function makeMutationStub() {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  };
}

function setCategories(data, overrides = {}) {
  useProductCategoriesMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

// Component is imported dynamically per test so any module-scoped React
// state (none today, but cheap insurance) is reset between renders.
const COMPONENT_PATH = '@/components/products/manage-categories';

async function importComponent() {
  const mod = await import(COMPONENT_PATH);
  return mod.ManageCategoriesDialog;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('<ManageCategoriesDialog> (Req 6.7)', () => {
  beforeEach(() => {
    useProductCategoriesMock.mockReset();
    createMutationStub = makeMutationStub();
    updateMutationStub = makeMutationStub();
    deleteMutationStub = makeMutationStub();
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('renders the category list returned by useProductCategories', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Sanity: query was scoped by salonId.
    expect(useProductCategoriesMock).toHaveBeenCalledWith(SALON_ID);

    // Each category name is visible.
    expect(screen.getByText('Hair Care')).not.toBeNull();
    expect(screen.getByText('Skin Care')).not.toBeNull();
    expect(screen.getByText('Tools')).not.toBeNull();
  });

  it('Create button calls useCreateProductCategory.mutate with the trimmed name', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Type a name with surrounding whitespace.
    const input = screen.getByLabelText('New category');
    fireEvent.change(input, { target: { value: '  Nail Care  ' } });

    // Click Add. The button's accessible name includes the icon's text;
    // querying by role + text matches the visible "Add" label.
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    expect(createMutationStub.mutate).toHaveBeenCalledTimes(1);
    const [payload] = createMutationStub.mutate.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        salon_id: SALON_ID,
        name: 'Nail Care', // trimmed
      }),
    );
    // display_order is auto-assigned to max+1 of existing rows (max = 2 → 3).
    expect(payload.display_order).toBe(3);
  });

  it('inline rename calls useUpdateProductCategory.mutate with the new trimmed name', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Enter rename mode for "Hair Care".
    fireEvent.click(screen.getByRole('button', { name: 'Rename Hair Care' }));

    // The inline input should now be present and editable.
    // The component renders the rename input with no explicit label, so
    // we find it by current value (the existing name).
    const renameInput = screen.getByDisplayValue('Hair Care');
    fireEvent.change(renameInput, { target: { value: '  Hair & Care  ' } });

    // Save via the "Save name" icon button.
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    expect(updateMutationStub.mutate).toHaveBeenCalledTimes(1);
    const [payload] = updateMutationStub.mutate.mock.calls[0];
    expect(payload).toEqual({
      id: 11,
      data: { name: 'Hair & Care' }, // trimmed
    });
  });

  it('Up/down reorder buttons swap display_order via useUpdateProductCategory', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Move "Hair Care" (display_order 0) DOWN — it should swap with
    // "Skin Care" (display_order 1). The component issues two chained
    // updateMutation.mutate() calls: the first sets the moved row to the
    // neighbour's display_order, the second (inside onSuccess) sets the
    // neighbour to the moved row's previous display_order.
    fireEvent.click(screen.getByRole('button', { name: 'Move Hair Care down' }));

    expect(updateMutationStub.mutate).toHaveBeenCalledTimes(1);
    const [firstPayload, firstOptions] =
      updateMutationStub.mutate.mock.calls[0];
    expect(firstPayload).toEqual({
      id: 11, // Hair Care
      data: { display_order: 1 }, // takes Skin Care's slot
    });
    expect(typeof firstOptions.onSuccess).toBe('function');

    // Simulate the first mutation succeeding so the chained second call
    // for the neighbour fires.
    firstOptions.onSuccess();

    expect(updateMutationStub.mutate).toHaveBeenCalledTimes(2);
    const [secondPayload] = updateMutationStub.mutate.mock.calls[1];
    expect(secondPayload).toEqual({
      id: 22, // Skin Care
      data: { display_order: 0 }, // takes Hair Care's previous slot
    });
  });

  it('Up button reorders by swapping with the previous neighbour', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Move "Tools" (display_order 2) UP — should swap with "Skin Care".
    fireEvent.click(screen.getByRole('button', { name: 'Move Tools up' }));

    expect(updateMutationStub.mutate).toHaveBeenCalledTimes(1);
    const [firstPayload] = updateMutationStub.mutate.mock.calls[0];
    expect(firstPayload).toEqual({ id: 33, data: { display_order: 1 } });
  });

  it('Up button is disabled on the first row, Down button is disabled on the last row', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Move Hair Care up' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Move Tools down' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('Delete button shows a confirmation and only then calls useDeleteProductCategory.mutate', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    // Click the row's Delete affordance.
    fireEvent.click(screen.getByRole('button', { name: 'Delete Skin Care' }));

    // Confirmation step must surface before any mutation runs.
    expect(deleteMutationStub.mutate).not.toHaveBeenCalled();
    // The confirmation dialog renders the row name in its title.
    expect(screen.getByText('Delete Skin Care?')).not.toBeNull();

    // Confirm deletion. The confirmation footer hosts a destructive
    // "Delete" button distinct from the row's icon button (it is the only
    // visible button labelled exactly "Delete" in the dialog footer).
    const confirmDialog = screen.getByText('Delete Skin Care?').closest('[role="dialog"]');
    expect(confirmDialog).not.toBeNull();
    const confirmDeleteBtn = within(confirmDialog).getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    expect(deleteMutationStub.mutate).toHaveBeenCalledTimes(1);
    const [id] = deleteMutationStub.mutate.mock.calls[0];
    expect(id).toBe(22); // Skin Care
  });

  it('cancelling the delete confirmation does not call useDeleteProductCategory.mutate', async () => {
    setCategories(CATEGORIES);
    const ManageCategoriesDialog = await importComponent();

    render(
      <ManageCategoriesDialog
        open={true}
        onOpenChange={() => {}}
        salonId={SALON_ID}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Tools' }));
    expect(screen.getByText('Delete Tools?')).not.toBeNull();

    const confirmDialog = screen.getByText('Delete Tools?').closest('[role="dialog"]');
    const cancelBtn = within(confirmDialog).getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(deleteMutationStub.mutate).not.toHaveBeenCalled();
  });
});
