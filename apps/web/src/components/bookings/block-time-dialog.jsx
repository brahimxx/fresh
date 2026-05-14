"use client";

import { useState, useEffect } from "react";
import { addHours } from "date-fns";
import { Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStaff } from "@/hooks/use-staff";
import { useSalon } from "@/providers/salon-provider";
import { useQueryClient } from "@tanstack/react-query";
import { bookingKeys } from "@/hooks/use-bookings";
import api from "@/lib/api-client";

function toDatetimeLocal(d) {
  if (!d) return "";
  var pad = function (n) { return String(n).padStart(2, "0"); };
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

function fromDatetimeLocal(str) {
  if (!str) return null;
  return new Date(str);
}

function toLocalISOString(d) {
  if (!d) return null;
  var pad = function (n) { return String(n).padStart(2, "0"); };
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + " " +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes()) + ":00"
  );
}

export function BlockTimeDialog({
  open,
  onOpenChange,
  initialDate,
  initialStaffId,
  // Edit mode — pass an existing time-off object to edit/delete it
  existingTimeOff = null,
}) {
  var isEditMode = !!existingTimeOff;
  var { salonId } = useSalon();
  var { data: staff } = useStaff(salonId);
  var queryClient = useQueryClient();

  var [staffId, setStaffId] = useState("");
  var [startDatetime, setStartDatetime] = useState("");
  var [endDatetime, setEndDatetime] = useState("");
  var [reason, setReason] = useState("");
  var [loading, setLoading] = useState(false);
  var [deleting, setDeleting] = useState(false);

  // Seed values when dialog opens
  useEffect(function () {
    if (!open) return;
    if (isEditMode) {
      // Pre-fill from existingTimeOff
      var sid = existingTimeOff.staffId || existingTimeOff.staff?.id;
      if (sid) setStaffId(String(sid));
      var start = existingTimeOff.start || existingTimeOff.startDatetime;
      var end   = existingTimeOff.end   || existingTimeOff.endDatetime;
      setStartDatetime(start ? toDatetimeLocal(new Date(String(start).replace(" ", "T"))) : "");
      setEndDatetime(end ? toDatetimeLocal(new Date(String(end).replace(" ", "T"))) : "");
      setReason(existingTimeOff.reason || "");
    } else {
      // New block
      var s = initialDate ? new Date(initialDate) : new Date();
      var minutes = s.getMinutes();
      s.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
      var e = addHours(s, 1);
      setStartDatetime(toDatetimeLocal(s));
      setEndDatetime(toDatetimeLocal(e));
      setReason("");
      if (initialStaffId) setStaffId(String(initialStaffId));
    }
  }, [open, initialDate, initialStaffId, existingTimeOff, isEditMode]);

  async function handleSubmit(evt) {
    evt.preventDefault();
    if (!staffId) { toast.error("Please select a staff member"); return; }
    if (!startDatetime || !endDatetime) { toast.error("Please set start and end times"); return; }
    var start = fromDatetimeLocal(startDatetime);
    var end   = fromDatetimeLocal(endDatetime);
    if (end <= start) { toast.error("End time must be after start time"); return; }

    setLoading(true);
    try {
      if (isEditMode) {
        // Delete old, insert new (no PATCH endpoint)
        await api.delete(`/staff/${staffId}/time-off`, {
          timeOffId: existingTimeOff.id,
        });
        await api.post(`/staff/${staffId}/time-off`, {
          startDatetime: toLocalISOString(start),
          endDatetime:   toLocalISOString(end),
          reason: reason || null,
        });
        toast.success("Blocked time updated");
      } else {
        await api.post(`/staff/${staffId}/time-off`, {
          startDatetime: toLocalISOString(start),
          endDatetime:   toLocalISOString(end),
          reason: reason || null,
        });
        toast.success("Blocked time added");
      }
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save blocked time");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existingTimeOff?.id) return;
    var sid = existingTimeOff.staffId || existingTimeOff.staff?.id;
    if (!sid) { toast.error("Cannot determine staff for this block"); return; }
    setDeleting(true);
    try {
      await api.delete(`/staff/${sid}/time-off`, {
        timeOffId: existingTimeOff.id,
      });
      toast.success("Blocked time removed");
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Failed to delete blocked time");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {isEditMode ? "Edit Blocked Time" : "Add Blocked Time"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Staff */}
          <div className="space-y-1.5">
            <Label htmlFor="block-staff">Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId} disabled={isEditMode}>
              <SelectTrigger id="block-staff">
                <SelectValue placeholder="Select staff member…" />
              </SelectTrigger>
              <SelectContent>
                {(staff || []).map(function (m) {
                  return (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-start">Start</Label>
              <input
                id="block-start"
                type="datetime-local"
                value={startDatetime}
                onChange={function (e) { setStartDatetime(e.target.value); }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end">End</Label>
              <input
                id="block-end"
                type="datetime-local"
                value={endDatetime}
                onChange={function (e) { setEndDatetime(e.target.value); }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="block-reason"
              placeholder="e.g. Lunch break, Staff meeting, Personal…"
              value={reason}
              onChange={function (e) { setReason(e.target.value); }}
              rows={2}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2 flex-wrap gap-2">
            {/* Delete button in edit mode */}
            {isEditMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={deleting} className="mr-auto">
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {deleting ? "Removing…" : "Remove"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove blocked time?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the blocked time slot. Staff will be available during this period again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="button" variant="outline" onClick={function () { onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEditMode ? "Save changes" : "Add blocked time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
