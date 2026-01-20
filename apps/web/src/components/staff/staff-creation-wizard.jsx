'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { useCreateStaff, STAFF_ROLES, STAFF_COLORS } from '@/hooks/use-staff';
import { useServices } from '@/hooks/use-services';

const wizardSchema = z.object({
  // Step 1: Basic Info (Required)
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  title: z.string().optional(),
  
  // Step 2: Personal Details (Optional)
  phoneSecondary: z.string().optional(),
  country: z.string().optional(),
  birthday: z.date().optional().nullable(),
  bio: z.string().optional(),
  color: z.string().optional(),
  
  // Step 3: Employment (Optional)
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  employmentType: z.enum(['employee', 'self_employed']).optional(),
  notes: z.string().optional(),
  
  // Step 4: Emergency Contact (Optional)
  emergencyName: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyEmail: z.string().optional(),
  
  // Step 5: Services & Settings (Optional)
  serviceIds: z.array(z.number()).optional(),
  isVisible: z.boolean().optional(),
});

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Name, contact, and role', required: true },
  { id: 2, title: 'Personal Details', description: 'Birthday, country, bio', required: false },
  { id: 3, title: 'Employment', description: 'Start date, employment type', required: false },
  { id: 4, title: 'Emergency Contact', description: 'Emergency contact information', required: false },
  { id: 5, title: 'Services & Settings', description: 'Assign services and preferences', required: false },
];

export function StaffCreationWizard({ open, onOpenChange, salonId }) {
  const [currentStep, setCurrentStep] = useState(1);
  const createStaff = useCreateStaff();
  const { data: services } = useServices(salonId);

  const form = useForm({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      title: '',
      phoneSecondary: '',
      country: '',
      birthday: null,
      bio: '',
      color: '#3B82F6',
      startDate: null,
      endDate: null,
      employmentType: 'employee',
      notes: '',
      emergencyName: '',
      emergencyRelationship: '',
      emergencyPhone: '',
      emergencyEmail: '',
      serviceIds: [],
      isVisible: true,
    },
  });

  function handleNext() {
    // Validate current step before moving forward
    const fieldsToValidate = getStepFields(currentStep);
    form.trigger(fieldsToValidate).then((isValid) => {
      if (isValid && currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    });
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSkip() {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }

  function getStepFields(step) {
    switch (step) {
      case 1:
        return ['name', 'email', 'phone', 'role', 'title'];
      case 2:
        return ['phoneSecondary', 'country', 'birthday', 'bio', 'color'];
      case 3:
        return ['startDate', 'endDate', 'employmentType', 'notes'];
      case 4:
        return ['emergencyName', 'emergencyRelationship', 'emergencyPhone', 'emergencyEmail'];
      case 5:
        return ['serviceIds', 'isVisible'];
      default:
        return [];
    }
  }

  async function onSubmit(data) {
    const payload = {
      salon_id: salonId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role,
      title: data.title || null,
      phoneSecondary: data.phoneSecondary || null,
      country: data.country || null,
      birthday: data.birthday ? format(data.birthday, 'yyyy-MM-dd') : null,
      bio: data.bio || null,
      color: data.color || '#3B82F6',
      startDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : null,
      endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : null,
      employmentType: data.employmentType || 'employee',
      notes: data.notes || null,
      serviceIds: data.serviceIds || [],
      isVisible: data.isVisible !== false,
      // Emergency contact data (we'll need a separate API call for this)
      emergencyContact: data.emergencyName ? {
        contactName: data.emergencyName,
        relationship: data.emergencyRelationship,
        phonePrimary: data.emergencyPhone,
        email: data.emergencyEmail,
      } : null,
    };

    createStaff.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
        setCurrentStep(1);
      },
    });
  }

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setCurrentStep(1);
  }

  const isLastStep = currentStep === STEPS.length;
  const isFirstStep = currentStep === 1;
  const currentStepInfo = STEPS[currentStep - 1];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}: {currentStepInfo.title}
            {!currentStepInfo.required && ' (Optional)'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors',
                  currentStep > step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep === step.id
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sarah Johnson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STAFF_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Determines permissions and visibility
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Stylist" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Displayed to clients when booking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Personal Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="phoneSecondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 555 987 6543" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Birthday</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Color</FormLabel>
                      <div className="flex gap-2 flex-wrap">
                        {STAFF_COLORS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => field.onChange(color.hex)}
                            className={cn(
                              'w-10 h-10 rounded-full border-2 transition-all',
                              field.value === color.hex
                                ? 'border-primary scale-110'
                                : 'border-transparent hover:scale-105'
                            )}
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief bio for clients to see..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Employment */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="self_employed">Self-Employed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes about this team member..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Only visible to managers and owners
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Emergency Contact */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add an emergency contact for this team member (optional but recommended)
                </p>

                <FormField
                  control={form.control}
                  name="emergencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Spouse, Parent, Sibling" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Services & Settings */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assign Services</FormLabel>
                      <FormDescription className="text-xs mb-2">
                        Select which services this team member can perform
                      </FormDescription>
                      <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                        {services && services.length > 0 ? (
                          services.map((service) => (
                            <FormField
                              key={service.id}
                              control={form.control}
                              name="serviceIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={service.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(service.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, service.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== service.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {service.name}
                                      {service.duration && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({service.duration} min)
                                        </span>
                                      )}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No services available. Add services first.
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isVisible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Visible to clients
                        </FormLabel>
                        <FormDescription>
                          Show this team member in booking widget and marketplace
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2 pt-6 border-t">
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {!isLastStep && !currentStepInfo.required && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                )}
                
                {!isLastStep ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createStaff.isPending}>
                    {createStaff.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create Team Member
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
