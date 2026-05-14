"use client";

import { useState } from "react";
import { Pencil, Check, X, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useClientNotes, useUpdateClientNotes, useAddClientNote } from "@/hooks/use-clients";

export function ClientNotes({ clientId, salonId }) {
  var [isEditing, setIsEditing] = useState(false);
  var [isAppending, setIsAppending] = useState(false);
  var [editValue, setEditValue] = useState("");
  var [appendValue, setAppendValue] = useState("");

  var { data: notes, isLoading } = useClientNotes(clientId, salonId);
  var updateNotes = useUpdateClientNotes();
  var addNote = useAddClientNote();

  // The API returns an array with one item (or empty) — the single notes text.
  var currentNotes = notes && notes.length > 0 ? notes[0].content : null;

  function handleStartEdit() {
    setEditValue(currentNotes || "");
    setIsEditing(true);
  }

  function handleSaveEdit() {
    updateNotes.mutate(
      { clientId, salonId, content: editValue.trim() },
      {
        onSuccess: function () {
          setIsEditing(false);
        },
      },
    );
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditValue("");
  }

  function handleAppendNote() {
    if (!appendValue.trim()) return;
    addNote.mutate(
      { clientId, salonId, content: appendValue.trim() },
      {
        onSuccess: function () {
          setAppendValue("");
          setIsAppending(false);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Notes</CardTitle>
        {!isEditing && !isAppending && (
          <div className="flex items-center gap-1">
            {currentNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAppending(true)}
              className="h-8 px-2"
            >
              + Add
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={5}
              placeholder="Write notes about this client..."
              autoFocus
              className="text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateNotes.isPending}
                className="h-8"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={updateNotes.isPending}
                className="h-8"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {updateNotes.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {currentNotes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {currentNotes}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </div>
            )}

            {isAppending && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Textarea
                  value={appendValue}
                  onChange={(e) => setAppendValue(e.target.value)}
                  rows={3}
                  placeholder="Add a note..."
                  autoFocus
                  className="text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsAppending(false); setAppendValue(""); }}
                    disabled={addNote.isPending}
                    className="h-8"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAppendNote}
                    disabled={!appendValue.trim() || addNote.isPending}
                    className="h-8"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {addNote.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
