"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Edit2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STAFF_COLORS } from "@/hooks/use-staff";
import { useUpdateStaff } from "@/hooks/use-staff";
import { cn } from "@/lib/utils";

var personalSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  phoneSecondary: z.string().optional(),
  country: z.string().optional(),
  birthday: z.date().optional().nullable(),
  color: z.string().optional(),
  title: z.string().optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  employmentType: z.enum(["employee", "self_employed"]).optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
});

export function StaffPersonalTab({ staff, salonId }) {
  var [isEditing, setIsEditing] = useState(false);
  var updateStaff = useUpdateStaff();

  var form = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: staff.firstName || staff.first_name || "",
      lastName: staff.lastName || staff.last_name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      phoneSecondary: staff.phoneSecondary || staff.phone_secondary || "",
      country: staff.country || "",
      birthday: staff.birthday ? new Date(staff.birthday) : null,
      color: staff.color || "#3B82F6",
      title: staff.title || "",
      startDate: staff.startDate || staff.start_date ? new Date(staff.startDate || staff.start_date) : null,
      endDate: staff.endDate || staff.end_date ? new Date(staff.endDate || staff.end_date) : null,
      employmentType: staff.employmentType || staff.employment_type || "employee",
      bio: staff.bio || "",
      notes: staff.notes || "",
    },
  });

  function onSubmit(data) {
    var payload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      phone_secondary: data.phoneSecondary || null,
      country: data.country || null,
      birthday: data.birthday ? format(data.birthday, "yyyy-MM-dd") : null,
      color: data.color,
      title: data.title || null,
      start_date: data.startDate ? format(data.startDate, "yyyy-MM-dd") : null,
      end_date: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
      employment_type: data.employmentType,
      bio: data.bio || null,
      notes: data.notes || null,
    };

    updateStaff.mutate(
      { id: staff.id, data: payload },
      {
        onSuccess: function () {
          setIsEditing(false);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Basic personal information</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={function () { setIsEditing(true); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="phoneSecondary"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Additional Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Birthday</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                disabled={!isEditing}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={function (date) { 
                                return date > new Date() || date < new Date("1900-01-01");
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Calendar Color</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAFF_COLORS.map(function (color) {
                              return (
                                <SelectItem key={color.hex} value={color.hex}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: color.hex }}
                                    />
                                    <span className="capitalize">{color.name}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Senior Stylist" disabled={!isEditing} />
                        </FormControl>
                        <FormDescription>Displayed to clients when booking</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} disabled={!isEditing} />
                      </FormControl>
                      <FormDescription>Public bio shown to clients</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {isEditing && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={function () {
                      form.reset();
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateStaff.isPending}>
                    {updateStaff.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Work Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Work Details</CardTitle>
          <CardDescription>Employment information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                disabled={!isEditing}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={function ({ field }) {
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                disabled={!isEditing}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="employmentType"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="self_employed">Self-Employed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} disabled={!isEditing} />
                      </FormControl>
                      <FormDescription>Private notes (not shown to clients)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
