"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Phone, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StaffEmergencyContactsTab({ staffId }) {
  var [contacts, setContacts] = useState([]);
  var [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>People to contact in case of emergency</CardDescription>
        </div>
        <Button size="sm" onClick={function () { setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No emergency contacts added yet</p>
            <Button variant="outline" className="mt-4" onClick={function () { setShowForm(true); }}>
              Add First Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map(function (contact) {
              return (
                <div key={contact.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{contact.contactName}</p>
                        {contact.isPrimary && <Badge>Primary</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Relationship: {contact.relationship}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phonePrimary}
                        </div>
                        {contact.phoneSecondary && (
                          <div className="text-muted-foreground">
                            {contact.phoneSecondary}
                          </div>
                        )}
                      </div>
                      {contact.email && (
                        <p className="text-sm text-muted-foreground mt-1">{contact.email}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
