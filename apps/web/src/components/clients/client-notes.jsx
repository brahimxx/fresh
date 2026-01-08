'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useClientNotes, useAddClientNote, useDeleteClientNote } from '@/hooks/use-clients';

export function ClientNotes({ clientId }) {
  var [newNote, setNewNote] = useState('');
  var [isAdding, setIsAdding] = useState(false);
  var [deleteNoteId, setDeleteNoteId] = useState(null);
  
  var { data: notes, isLoading } = useClientNotes(clientId);
  var addNote = useAddClientNote();
  var deleteNote = useDeleteClientNote();
  
  function handleAddNote() {
    if (!newNote.trim()) return;
    
    addNote.mutate(
      { clientId: clientId, content: newNote.trim() },
      {
        onSuccess: function() {
          setNewNote('');
          setIsAdding(false);
        },
      }
    );
  }
  
  function handleDeleteNote() {
    if (deleteNoteId) {
      deleteNote.mutate(
        { clientId: clientId, noteId: deleteNoteId },
        {
          onSuccess: function() {
            setDeleteNoteId(null);
          },
        }
      );
    }
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Notes</CardTitle>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={function() { setIsAdding(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {isAdding && (
          <div className="space-y-2">
            <Textarea
              placeholder="Write a note..."
              value={newNote}
              onChange={function(e) { setNewNote(e.target.value); }}
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={function() { setIsAdding(false); setNewNote(''); }}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNote.isPending}
              >
                {addNote.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map(function(note) {
              return (
                <div key={note.id} className="group relative bg-muted/50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap pr-8">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.created_at && format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                    {note.created_by_name && (' • ' + note.created_by_name)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={function() { setDeleteNoteId(note.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            {!isAdding && (
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1"
                onClick={function() { setIsAdding(true); }}
              >
                Add the first note
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={function(open) { if (!open) setDeleteNoteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
