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
import { Edit, Check, XCircle, MoreVertical, CheckCircle } from "lucide-react";

export function EventQuickActions({ booking, onEdit, onConfirm, onComplete, onCancel }) {
  var [open, setOpen] = useState(false);

  if (!booking) return null;

  var canConfirm = booking.status === "pending";
  var canComplete = booking.status === "confirmed";
  var canCancel = booking.status !== "cancelled" && booking.status !== "completed";

  return (
    <div
      className="absolute top-1 right-1 z-20"
      onClick={function (e) {
        e.stopPropagation();
      }}
      onMouseDown={function (e) {
        e.stopPropagation(); // Prevent drag & drop from interfering
      }}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={function (e) {
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
              onClick={function (e) {
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
              onClick={function (e) {
                e.stopPropagation();
                setOpen(false);
                if (onComplete) onComplete(booking);
              }}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-2" />
              Complete
            </DropdownMenuItem>
          )}
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={function (e) {
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
