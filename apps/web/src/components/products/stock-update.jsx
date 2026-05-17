'use client';

/**
 * StockUpdateDialog — manual stock adjustment surface for a single product.
 *
 * The dialog drives the extended `useUpdateProductStock` mutation
 * (`{ id, mode, quantity, reason_code, reason_note }`) and, per Requirement 4.4,
 * embeds the read-only `<StockHistory>` panel side-by-side with the form so
 * the user can review the audit trail without leaving the dialog.
 *
 * Inputs (Requirements 3.1, 3.7):
 *   - mode         : 'set' | 'add' | 'subtract'
 *   - quantity     : non-negative integer (the user-entered amount; arithmetic
 *                    and the clamp-at-zero are performed server-side)
 *   - reason_code  : one of the manual codes — `sale` and `refund` are reserved
 *                    for the checkout / refund flow and not selectable here
 *   - reason_note  : optional free-text note, capped at 500 characters
 *
 * Submission (Requirement 3.8):
 *   The hook posts the four fields verbatim to the Stock_API; we do NOT
 *   pre-compute `add` / `subtract` deltas client-side anymore — the server
 *   owns that arithmetic and the audit trail.
 */

import { useState, useEffect } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useUpdateProductStock } from '@/hooks/use-products';
import { StockHistory } from '@/components/products/stock-history';

// ─── Reason code vocabulary ────────────────────────────────────────────────
//
// Manual reason codes only. The Stock_API rejects `sale` and `refund` from
// this surface (Requirement 3.7) — those codes are written exclusively by the
// checkout / refund flow and are surfaced in StockHistory read-only.

var MANUAL_REASON_CODES = [
  { value: 'manual_set', label: 'Manual set' },
  { value: 'manual_adjustment', label: 'Manual adjustment' },
  { value: 'restock', label: 'Restock' },
  { value: 'waste', label: 'Waste' },
  { value: 'correction', label: 'Correction' },
];

// Sensible default for each mode. `set` defaults to `manual_set`, the other
// two modes default to `manual_adjustment`. The user can override.
function defaultReasonForMode(mode) {
  return mode === 'set' ? 'manual_set' : 'manual_adjustment';
}

var REASON_NOTE_MAX = 500;

// ─── Component ─────────────────────────────────────────────────────────────

export function StockUpdateDialog({ open, onOpenChange, product }) {
  var [mode, setMode] = useState('set');
  var [quantity, setQuantity] = useState(0);
  var [reasonCode, setReasonCode] = useState('manual_set');
  var [reasonNote, setReasonNote] = useState('');

  var updateStock = useUpdateProductStock();

  // Reset form state every time the dialog is opened against a (possibly
  // different) product. The starting `quantity` mirrors the current stock so
  // the default `set` mode reads as "no change" until the user edits it.
  useEffect(
    function () {
      if (open && product) {
        setMode('set');
        setQuantity(product.stock_quantity || 0);
        setReasonCode('manual_set');
        setReasonNote('');
      }
    },
    [open, product]
  );

  // Whenever the user switches mode, snap the reason code to the matching
  // default — this keeps the dialog discoverable while leaving the user free
  // to pick a different code afterwards.
  function handleModeChange(next) {
    setMode(next);
    setReasonCode(defaultReasonForMode(next));
    if (next !== 'set') {
      // Add / subtract default to a delta of 0 (user types the amount); set
      // mode keeps the existing value so the field reads as "no change".
      setQuantity(0);
    } else if (product) {
      setQuantity(product.stock_quantity || 0);
    }
  }

  function handleNoteChange(e) {
    var next = e.target.value || '';
    // Hard-cap on the client too so the maxLength feedback feels immediate;
    // the server enforces the same 500-char ceiling (Requirement 3.7).
    if (next.length > REASON_NOTE_MAX) next = next.slice(0, REASON_NOTE_MAX);
    setReasonNote(next);
  }

  function incrementQuantity() {
    setQuantity(function (q) {
      return q + 1;
    });
  }
  function decrementQuantity() {
    setQuantity(function (q) {
      return Math.max(0, q - 1);
    });
  }

  function handleSubmit() {
    if (!product) return;
    if (!reasonCode) return;

    // The server owns the clamp-at-zero math; we forward the raw
    // `{ mode, quantity }` pair plus the reason payload (Requirement 3.8).
    var payload = {
      id: product.id,
      mode: mode,
      quantity: quantity,
      reason_code: reasonCode,
    };
    var trimmedNote = reasonNote.trim();
    if (trimmedNote.length > 0) {
      payload.reason_note = trimmedNote;
    }

    updateStock.mutate(payload, {
      onSuccess: function () {
        onOpenChange(false);
      },
    });
  }

  if (!product) return null;

  // Best-effort preview of the resulting stock for `add` / `subtract` so the
  // user sees what the server will compute. The clamp at zero matches the
  // server contract (Requirement 3.4 / 3.5).
  var current = product.stock_quantity || 0;
  var previewStock =
    mode === 'add'
      ? current + quantity
      : mode === 'subtract'
        ? Math.max(0, current - quantity)
        : quantity;

  var quantityLabel =
    mode === 'set'
      ? 'New quantity'
      : mode === 'add'
        ? 'Amount to add'
        : 'Amount to subtract';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>
            {product.name}
            {product.sku ? (
              <span className="ml-1 text-xs text-muted-foreground">
                · {product.sku}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 md:grid-cols-2">
          {/* ─── Adjustment form ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Current stock: </span>
              <span className="font-medium text-foreground">{current}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-mode">Update mode</Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger id="stock-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set to exact amount</SelectItem>
                  <SelectItem value="add">Add to stock</SelectItem>
                  <SelectItem value="subtract">Subtract from stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-quantity">{quantityLabel}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={decrementQuantity}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={function (e) {
                    setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0));
                  }}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={incrementQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {mode !== 'set' ? (
                <p className="text-xs text-muted-foreground">
                  New stock will be{' '}
                  <span className="font-medium text-foreground">
                    {previewStock}
                  </span>
                  {mode === 'subtract' && current - quantity < 0 ? (
                    <span className="ml-1">(clamped at 0)</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-reason-code">Reason</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger id="stock-reason-code">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_REASON_CODES.map(function (r) {
                    return (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-reason-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="stock-reason-note"
                value={reasonNote}
                onChange={handleNoteChange}
                placeholder="Purchase order number, supplier, or context"
                maxLength={REASON_NOTE_MAX}
                rows={3}
              />
              <p className="text-right text-xs text-muted-foreground">
                {reasonNote.length} / {REASON_NOTE_MAX}
              </p>
            </div>
          </div>

          {/* ─── Embedded history panel (Requirement 4.4) ─────────────── */}
          <div className="min-w-0">
            <StockHistory productId={product.id} pageSize={10} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={function () {
              onOpenChange(false);
            }}
            disabled={updateStock.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateStock.isPending || !reasonCode}
          >
            {updateStock.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Update stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
