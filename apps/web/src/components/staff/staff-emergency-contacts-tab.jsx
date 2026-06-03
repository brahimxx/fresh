"use client";

import { useEffect, useState } from "react";
import { Plus, Phone, AlertCircle, Edit2, Trash2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import api from "@/lib/api-client";
import { toast } from "sonner";

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const PHONE_PATTERN = /^[+()\d\s.-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  contactName: "",
  relationship: "",
  phonePrimary: "",
  phoneSecondary: "",
  email: "",
  notes: "",
  isPrimary: false,
};

function buildForm(contact) {
  if (!contact) {
    return emptyForm;
  }

  return {
    contactName: contact.contactName || "",
    relationship: contact.relationship || "",
    phonePrimary: contact.phonePrimary || "",
    phoneSecondary: contact.phoneSecondary || "",
    email: contact.email || "",
    notes: contact.notes || "",
    isPrimary: !!contact.isPrimary,
  };
}

export function StaffEmergencyContactsTab({ staffId }) {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const handleOpenAddForm = () => {
    setEditingContactId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleOpenEditForm = (contact) => {
    setEditingContactId(contact.id);
    setForm(buildForm(contact));
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContactId(null);
    setForm(emptyForm);
  };

 

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      try {
        setIsLoading(true);
        const response = await api.get(`/staff/${staffId}/emergency-contacts`);
        if (active) {
          setContacts(response.data.contacts || []);
        }
      } catch (error) {
        if (active) {
          toast.error(error.message || "Failed to load emergency contacts");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadContacts();

    return () => {
      active = false;
    };
  }, [staffId]);

  const handleAddContact = async (event) => {
    event.preventDefault();

    const contactName = form.contactName.trim();
    const relationship = form.relationship.trim();
    const phonePrimary = form.phonePrimary.trim();
    const phoneSecondary = form.phoneSecondary.trim();
    const email = form.email.trim();
    const notes = form.notes.trim();

    if (!contactName || !phonePrimary) {
      toast.error("Contact name and primary phone are required");
      return;
    }

    if (contactName.length > 150 || !NAME_PATTERN.test(contactName)) {
      toast.error("Contact name can only include letters, spaces, apostrophes, periods, and hyphens");
      return;
    }

    if (relationship.length > 100) {
      toast.error("Relationship is too long");
      return;
    }

    if (phonePrimary.length > 20 || !PHONE_PATTERN.test(phonePrimary)) {
      toast.error("Primary phone must be a valid phone number");
      return;
    }

    if (phoneSecondary && (phoneSecondary.length > 20 || !PHONE_PATTERN.test(phoneSecondary))) {
      toast.error("Secondary phone must be a valid phone number");
      return;
    }

    if (email && (email.length > 255 || !EMAIL_PATTERN.test(email))) {
      toast.error("Email must be a valid email address");
      return;
    }

    if (notes.length > 5000) {
      toast.error("Notes are too long");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        contactName,
        relationship,
        phonePrimary,
        phoneSecondary,
        email,
        notes,
        isPrimary: form.isPrimary,
      };

      if (editingContactId) {
        const response = await api.patch(`/staff/${staffId}/emergency-contacts/${editingContactId}`, payload);
        const updatedContact = response.data.contact;
        setContacts((current) =>
          current.map((contact) =>
            contact.id === updatedContact.id
              ? updatedContact
              : form.isPrimary
                ? { ...contact, isPrimary: false }
                : contact
          )
        );
        handleCloseForm();
        toast.success("Emergency contact updated");
        return;
      }

      const response = await api.post(`/staff/${staffId}/emergency-contacts`, payload);

      const newContact = response.data.contact;
      setContacts((current) => {
        const updated = form.isPrimary
          ? current.map((contact) => ({ ...contact, isPrimary: false }))
          : current;
        return [newContact, ...updated];
      });
      handleCloseForm();
      toast.success("Emergency contact added");
    } catch (error) {
      toast.error(error.message || "Failed to add emergency contact");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      setIsDeleting(true);
      await api.delete(`/staff/${staffId}/emergency-contacts/${contactId}`);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      toast.success("Emergency contact deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete emergency contact");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMakePrimary = async (contact) => {
    try {
      setIsSaving(true);
      const response = await api.patch(`/staff/${staffId}/emergency-contacts/${contact.id}`, {
        contactName: contact.contactName,
        relationship: contact.relationship,
        phonePrimary: contact.phonePrimary,
        phoneSecondary: contact.phoneSecondary,
        email: contact.email,
        notes: contact.notes,
        isPrimary: true,
      });

      const updatedContact = response.data.contact;
      setContacts((current) =>
        current.map((item) =>
          item.id === updatedContact.id
            ? updatedContact
            : { ...item, isPrimary: false }
        )
      );
      toast.success("Primary contact updated");
    } catch (error) {
      toast.error(error.message || "Failed to update primary contact");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Emergency Contacts</CardTitle>
            <CardDescription>People to contact in case of emergency</CardDescription>
          </div>
          <Button size="sm" onClick={handleOpenAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading emergency contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No emergency contacts added yet</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenAddForm}>
                Add First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{contact.contactName}</p>
                        {contact.isPrimary && <Badge>Primary</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Relationship: {contact.relationship || "Not specified"}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phonePrimary}
                        </div>
                        {contact.phoneSecondary && (
                          <div className="text-muted-foreground">{contact.phoneSecondary}</div>
                        )}
                      </div>
                      {contact.email && (
                        <p className="text-sm text-muted-foreground mt-1">{contact.email}</p>
                      )}
                      {contact.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{contact.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!contact.isPrimary && (
                        <Button variant="ghost" size="sm" onClick={() => handleMakePrimary(contact)}>
                          <Star className="h-4 w-4 mr-2" />
                          Primary
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditForm(contact)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Emergency Contact Permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The contact will be permanently removed from the database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <div className="py-4">
                            <div className="rounded-md border bg-muted/20 p-4 space-y-3">
                              <div>
                                <p className="font-medium">{contact.contactName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {contact.relationship || "No relationship specified"}
                                </p>
                              </div>
                              <div className="text-sm space-y-1 text-muted-foreground">
                                <p>{contact.phonePrimary}</p>
                                {contact.email && <p>{contact.email}</p>}
                              </div>
                            </div>
                          </div>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Contact</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteContact(contact.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Delete Permanently"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : handleCloseForm())}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <form className="flex flex-col h-[calc(100%-5rem)]" onSubmit={handleAddContact}>
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle className="text-2xl">
                {editingContactId ? "Edit emergency contact" : "Add emergency contact"}
              </SheetTitle>
              <SheetDescription>
                Save a person we can reach if something urgent happens.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact name</Label>
                    <Input
                      id="contactName"
                      value={form.contactName}
                      onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship</Label>
                    <Input
                      id="relationship"
                      value={form.relationship}
                      onChange={(event) => setForm((current) => ({ ...current, relationship: event.target.value }))}
                      placeholder="Spouse, parent, sibling"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phonePrimary">Primary phone</Label>
                    <Input
                      id="phonePrimary"
                      value={form.phonePrimary}
                      onChange={(event) => setForm((current) => ({ ...current, phonePrimary: event.target.value }))}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneSecondary">Secondary phone</Label>
                    <Input
                      id="phoneSecondary"
                      value={form.phoneSecondary}
                      onChange={(event) => setForm((current) => ({ ...current, phoneSecondary: event.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Anything important for the team to know"
                      className="min-h-32"
                    />
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                    <h4 className="font-medium text-sm">Contact priority</h4>
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="isPrimary" className="text-sm font-medium">
                          Mark as primary
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Primary contacts are shown first.
                        </p>
                      </div>
                      <Switch
                        id="isPrimary"
                        checked={form.isPrimary}
                        onCheckedChange={(checked) => setForm((current) => ({ ...current, isPrimary: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-background px-6 py-4 border-t space-y-3">
              <div className="flex justify-end gap-2 w-full">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingContactId ? "Update contact" : "Save contact"}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      
    </>
  );
}
