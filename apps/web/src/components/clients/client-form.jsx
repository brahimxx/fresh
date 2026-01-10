'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateClient, useUpdateClient } from '@/hooks/use-clients';

var clientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'none', '']).optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
});

export function ClientFormDialog({ open, onOpenChange, client, salonId }) {
  var createClient = useCreateClient();
  var updateClient = useUpdateClient();
  var isEditing = !!client;
  
  var form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      address: '',
      city: '',
      postal_code: '',
      notes: '',
    },
  });
  
  useEffect(function() {
    if (open) {
      if (client) {
        form.reset({
          first_name: client.first_name || client.firstName || '',
          last_name: client.last_name || client.lastName || '',
          email: client.email || '',
          phone: client.phone || '',
          gender: client.gender || '',
          date_of_birth: client.date_of_birth || client.dateOfBirth || '',
          address: client.address || '',
          city: client.city || '',
          postal_code: client.postal_code || client.postalCode || '',
          notes: client.notes || '',
        });
      } else {
        form.reset({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          gender: '',
          date_of_birth: '',
          address: '',
          city: '',
          postal_code: '',
          notes: '',
        });
      }
    }
  }, [open, client]);
  
  function onSubmit(data) {
    var payload = {
      ...data,
      salon_id: salonId,
    };
    
    // Remove empty strings and handle 'none' gender
    Object.keys(payload).forEach(function(key) {
      if (payload[key] === '' || payload[key] === 'none') {
        delete payload[key];
      }
    });
    
    if (isEditing) {
      updateClient.mutate(
        { id: client.id, data: payload },
        {
          onSuccess: function() {
            onOpenChange(false);
          },
        }
      );
    } else {
      createClient.mutate(payload, {
        onSuccess: function() {
          onOpenChange(false);
        },
      });
    }
  }
  
  var isPending = createClient.isPending || updateClient.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update client information' : 'Create a new client profile'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...form.register('first_name')}
                  placeholder="John"
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...form.register('last_name')}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>
            
            {/* Gender & Birthday */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.watch('gender') || 'none'}
                  onValueChange={function(value) { form.setValue('gender', value); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...form.register('date_of_birth')}
                />
              </div>
            </div>
            
            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register('address')}
                placeholder="123 Main Street"
              />
            </div>
            
            {/* City & Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  {...form.register('postal_code')}
                  placeholder="10001"
                />
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Any additional notes about this client..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={function() { onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Client')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
