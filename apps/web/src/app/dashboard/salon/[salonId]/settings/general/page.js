'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, ImageIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

import {
  useSalonSettings,
  useUpdateSalonSettings,
  useUploadSalonPhoto,
  useDeleteSalonPhoto,
} from '@/hooks/use-settings';

var generalSchema = z.object({
  name: z.string().min(1, 'Salon name is required'),
  description: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
});

export default function GeneralSettingsPage() {
  var params = useParams();
  var { toast } = useToast();
  var fileInputRef = useRef(null);
  
  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updateSettings = useUpdateSalonSettings();
  var uploadPhoto = useUploadSalonPhoto();
  var deletePhoto = useDeleteSalonPhoto();
  
  var form = useForm({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
    },
  });
  
  // Populate form when salon data loads
  useEffect(function() {
    if (salon) {
      form.reset({
        name: salon.name || '',
        description: salon.description || '',
        email: salon.email || '',
        phone: salon.phone || '',
        website: salon.website || '',
        address: salon.address || '',
        city: salon.city || '',
        state: salon.state || '',
        zip_code: salon.zip_code || '',
        country: salon.country || '',
      });
    }
  }, [salon, form]);
  
  function onSubmit(data) {
    updateSettings.mutate({
      salonId: params.salonId,
      data: data,
    }, {
      onSuccess: function() {
        toast({ title: 'Settings saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handlePhotoUpload(event) {
    var file = event.target.files?.[0];
    if (!file) return;
    
    uploadPhoto.mutate({
      salonId: params.salonId,
      file: file,
      type: 'gallery',
    }, {
      onSuccess: function() {
        toast({ title: 'Photo uploaded' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handleDeletePhoto(photoId) {
    deletePhoto.mutate({
      salonId: params.salonId,
      photoId: photoId,
    }, {
      onSuccess: function() {
        toast({ title: 'Photo deleted' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">General Settings</h1>
        <p className="text-muted-foreground">
          Manage your salon's basic information
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                This information will be displayed to your clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Salon Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your Salon Name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Tell clients about your salon..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description that appears on your booking page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>
          
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contact@salon.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 234 567 8900" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              
              <FormField
                control={form.control}
                name="website"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://yoursalon.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>
          
          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={function({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>ZIP / Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12345" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={function({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                Add photos to showcase your salon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {(salon?.photos || []).map(function(photo) {
                  return (
                    <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo.url}
                        alt="Salon photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={function() { handleDeletePhoto(photo.id); }}
                        className="absolute top-2 right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                
                {/* Upload Button */}
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
          
          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
