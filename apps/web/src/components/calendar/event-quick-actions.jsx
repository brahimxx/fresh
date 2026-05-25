"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Check, XCircle, MoreHorizontal, CheckCircle, ShoppingCart } from "lucide-react";

export function EventQuickActions({ booking, onEdit, onConfirm, onComplete, onCheckout, onCancel }) {
  const [open, setOpen] = useState(false);

  if (!booking) return null;

  const canConfirm = booking.status === "pending";
  const canComplete = booking.status === "confirmed";
  const canCancel = booking.status !== "cancelled" && booking.status !== "completed";

  return (
    <div
      className={"absolute right-0.5 top-1/2 -translate-y-1/2 z-20 " + (open ? "opacity-100" : "opacity-0 group-hover:opacity-100") + " transition-opacity duration-150"}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              if (onEdit) onEdit(booking);
            }}
          >
            <Edit className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
          {canConfirm && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (onConfirm) onConfirm(booking);
              }}
            >
              <Check className="h-3.5 w-3.5 mr-2" />
              Confirm
            </DropdownMenuItem>
          )}
          {canComplete && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (onCheckout) onCheckout(booking);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-2" />
              Checkout
            </DropdownMenuItem>
          )}
          {canComplete && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (onComplete) onComplete(booking);
              }}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-2" />
              Quick Cash
            </DropdownMenuItem>
          )}
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (onCancel) onCancel(booking);
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Cancel
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
