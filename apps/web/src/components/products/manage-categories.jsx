'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategories,
  useUpdateProductCategory,
} from '@/hooks/use-product-categories';

/**
 * ManageCategoriesDialog
 *
 * Lists, creates, renames, reorders (via up/down handles updating
 * `display_order`), and soft-deletes per-salon product categories.
 * Bound to the `useProductCategories` hook family.
 */
export function ManageCategoriesDialog({ open, onOpenChange, salonId }) {
  var categoriesQuery = useProductCategories(salonId);
  var createMutation = useCreateProductCategory();
  var updateMutation = useUpdateProductCategory();
  var deleteMutation = useDeleteProductCategory();

  var [newName, setNewName] = useState('');
  var [editingId, setEditingId] = useState(null);
  var [editingName, setEditingName] = useState('');
  var [pendingDelete, setPendingDelete] = useState(null);
  var [reorderingId, setReorderingId] = useState(null);

  // Reset transient state whenever the dialog re-opens
  useEffect(
    function () {
      if (open) {
        setNewName('');
        setEditingId(null);
        setEditingName('');
        setPendingDelete(null);
        setReorderingId(null);
      }
    },
    [open],
  );

  var categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  var isLoading = categoriesQuery.isLoading;
  var loadError = categoriesQuery.error;

  function handleCreate(event) {
    if (event) event.preventDefault();
    var trimmed = newName.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      toast.error('Name must be between 1 and 100 characters');
      return;
    }
    if (!salonId) return;

    var nextOrder = categories.length > 0
      ? Math.max.apply(
          null,
          categories.map(function (c) { return c.display_order || 0; }),
        ) + 1
      : 0;

    createMutation.mutate(
      { salon_id: salonId, name: trimmed, display_order: nextOrder },
      {
        onSuccess: function () {
          setNewName('');
          toast.success('Category created');
        },
        onError: function (err) {
          toast.error(err?.message || 'Failed to create category');
        },
      },
    );
  }

  function startEditing(category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
  }

  function commitEditing() {
    var trimmed = editingName.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      toast.error('Name must be between 1 and 100 characters');
      return;
    }
    var current = categories.find(function (c) { return c.id === editingId; });
    if (!current) {
      cancelEditing();
      return;
    }
    if (trimmed === current.name) {
      cancelEditing();
      return;
    }

    updateMutation.mutate(
      { id: editingId, data: { name: trimmed } },
      {
        onSuccess: function () {
          cancelEditing();
          toast.success('Category renamed');
        },
        onError: function (err) {
          toast.error(err?.message || 'Failed to rename category');
        },
      },
    );
  }

  // Swap display_order with the neighbour at `targetIndex`. The list is
  // already sorted by display_order ASC, name ASC server-side.
  function reorder(category, direction) {
    var sorted = categories.slice().sort(function (a, b) {
      var ao = a.display_order || 0;
      var bo = b.display_order || 0;
      if (ao !== bo) return ao - bo;
      return String(a.name).localeCompare(String(b.name));
    });
    var index = sorted.findIndex(function (c) { return c.id === category.id; });
    if (index < 0) return;
    var targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    var current = sorted[index];
    var neighbour = sorted[targetIndex];
    var currentOrder = current.display_order || 0;
    var neighbourOrder = neighbour.display_order || 0;

    // If both share the same display_order (legacy data), spread them apart
    // so the swap actually changes ordering.
    if (currentOrder === neighbourOrder) {
      if (direction === 'up') {
        currentOrder = neighbourOrder;
        neighbourOrder = neighbourOrder + 1;
      } else {
        currentOrder = neighbourOrder + 1;
        neighbourOrder = neighbourOrder;
      }
    }

    setReorderingId(current.id);

    updateMutation.mutate(
      { id: current.id, data: { display_order: neighbourOrder } },
      {
        onSuccess: function () {
          updateMutation.mutate(
            { id: neighbour.id, data: { display_order: currentOrder } },
            {
              onSuccess: function () {
                setReorderingId(null);
              },
              onError: function (err) {
                setReorderingId(null);
                toast.error(err?.message || 'Failed to reorder');
              },
            },
          );
        },
        onError: function (err) {
          setReorderingId(null);
          toast.error(err?.message || 'Failed to reorder');
        },
      },
    );
  }

  function confirmDelete(category) {
    setPendingDelete(category);
  }

  function performDelete() {
    if (!pendingDelete) return;
    var id = pendingDelete.id;
    deleteMutation.mutate(id, {
      onSuccess: function () {
        setPendingDelete(null);
        toast.success('Category deleted');
      },
      onError: function (err) {
        toast.error(err?.message || 'Failed to delete category');
      },
    });
  }

  // Sorted view used for rendering. The API already orders rows but we sort
  // again locally so the up/down buttons behave correctly during optimistic
  // reorders.
  var sortedCategories = categories.slice().sort(function (a, b) {
    var ao = a.display_order || 0;
    var bo = b.display_order || 0;
    if (ao !== bo) return ao - bo;
    return String(a.name).localeCompare(String(b.name));
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
            <DialogDescription>
              Create, rename, reorder, and delete the product categories for
              this salon. Deleting a category leaves its products visible with
              no category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-2">
            <Label htmlFor="manage-categories-new">New category</Label>
            <div className="flex items-center gap-2">
              <Input
                id="manage-categories-new"
                placeholder="e.g. Hair Care"
                value={newName}
                onChange={function (e) { setNewName(e.target.value); }}
                maxLength={100}
                disabled={createMutation.isPending}
              />
              <Button
                type="submit"
                disabled={createMutation.isPending || newName.trim().length === 0}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="ml-2">Add</span>
              </Button>
            </div>
          </form>

          <div className="border rounded-md">
            <ScrollArea className="max-h-80">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : loadError ? (
                <div className="p-4 text-sm text-red-600">
                  Failed to load categories.
                  <Button
                    variant="link"
                    className="ml-2 h-auto p-0"
                    onClick={function () { categoriesQuery.refetch(); }}
                  >
                    Retry
                  </Button>
                </div>
              ) : sortedCategories.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No categories yet. Create one above to start organising your
                  products.
                </div>
              ) : (
                <ul className="divide-y">
                  {sortedCategories.map(function (category, index) {
                    var isFirst = index === 0;
                    var isLast = index === sortedCategories.length - 1;
                    var isEditing = editingId === category.id;
                    var isReordering = reorderingId === category.id;
                    var rowDisabled =
                      updateMutation.isPending ||
                      deleteMutation.isPending ||
                      isReordering;

                    return (
                      <li
                        key={category.id}
                        className="flex items-center gap-2 p-2"
                      >
                        <div className="flex flex-col">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label={'Move ' + category.name + ' up'}
                            disabled={isFirst || rowDisabled}
                            onClick={function () { reorder(category, 'up'); }}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label={'Move ' + category.name + ' down'}
                            disabled={isLast || rowDisabled}
                            onClick={function () { reorder(category, 'down'); }}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={function (e) { setEditingName(e.target.value); }}
                              onKeyDown={function (e) {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitEditing();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEditing();
                                }
                              }}
                              maxLength={100}
                              disabled={updateMutation.isPending}
                            />
                          ) : (
                            <div className="truncate font-medium">
                              {category.name}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Order {category.display_order ?? 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Save name"
                                onClick={commitEditing}
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Cancel rename"
                                onClick={cancelEditing}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={'Rename ' + category.name}
                                onClick={function () { startEditing(category); }}
                                disabled={rowDisabled}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={'Delete ' + category.name}
                                onClick={function () { confirmDelete(category); }}
                                disabled={rowDisabled}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={function () { onOpenChange(false); }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!pendingDelete}
        onOpenChange={function (open) { if (!open) setPendingDelete(null); }}
        title={'Delete ' + (pendingDelete ? pendingDelete.name : 'category') + '?'}
        description="Products in this category will keep their data and remain visible, but will no longer be assigned to a category."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteMutation.isPending}
        onConfirm={performDelete}
      />
    </>
  );
}

export default ManageCategoriesDialog;
