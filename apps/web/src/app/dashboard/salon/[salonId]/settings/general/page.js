"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, X, AlertTriangle, Trash2, Info, Building2,
  Mail, Phone, Globe, MapPin, Camera, DollarSign, ImagePlus
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

import {
  useSalonSettings,
  useUpdateSalonSettings,
  useUploadSalonPhoto,
  useDeleteSalonPhoto,
  useDeleteSalon,
} from "@/hooks/use-settings";

var generalSchema = z.object({
  name: z.string().min(1, "Salon name is required"),
  currency: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  is_physical: z.boolean().optional(),
  is_mobile: z.boolean().optional(),
  is_virtual: z.boolean().optional(),
  virtual_meeting_link: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  travel_radius: z.coerce.number().optional().nullable(),
  travel_fee_type: z.string().optional().nullable(),
  travel_fee_amount: z.coerce.number().optional().nullable(),
  min_booking_amount: z.coerce.number().optional().nullable(),
  travel_buffer_time: z.coerce.number().optional().nullable(),
  covered_zip_codes: z.string().optional().nullable(),
});

export default function GeneralSettingsPage() {
  var params = useParams();
  var router = useRouter();
  var { toast } = useToast();
  var fileInputRef = useRef(null);
  var [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  var [deleteBlockers, setDeleteBlockers] = useState(null);
  var [confirmDeleteText, setConfirmDeleteText] = useState("");

  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updateSettings = useUpdateSalonSettings();
  var uploadPhoto = useUploadSalonPhoto();
  var deletePhoto = useDeleteSalonPhoto();
  var deleteSalon = useDeleteSalon();

  var form = useForm({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: "",
      currency: "EUR",
      description: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      is_physical: true,
      is_mobile: false,
      is_virtual: false,
      virtual_meeting_link: "",
      travel_radius: 0,
      travel_fee_type: "none",
      travel_fee_amount: 0,
      min_booking_amount: 0,
      travel_buffer_time: 0,
      covered_zip_codes: "",
    },
  });

  // Populate form when salon data loads
  useEffect(
    function () {
      if (salon) {
        form.reset({
          name: salon.name || "",
          currency: salon.currency || "EUR",
          description: salon.description || "",
          email: salon.email || "",
          phone: salon.phone || "",
          website: salon.website || "",
          address:
            salon.address === "Mobile or Virtual Provider"
              ? ""
              : salon.address || "",
          city: salon.city === "N/A" ? "" : salon.city || "",
          state: salon.state || "",
          zip_code: salon.zip_code || "",
          country: salon.country === "N/A" ? "" : salon.country || "",
          is_physical: salon.is_physical ?? true,
          is_mobile: salon.is_mobile ?? false,
          is_virtual: salon.is_virtual ?? false,
          virtual_meeting_link: salon.virtual_meeting_link || "",
          travel_radius: salon.travel_radius ?? 0,
          travel_fee_type: salon.travel_fee_type ?? "none",
          travel_fee_amount: salon.travel_fee_amount ?? 0,
          min_booking_amount: salon.min_booking_amount ?? 0,
          travel_buffer_time: salon.travel_buffer_time ?? 0,
          covered_zip_codes: salon.covered_zip_codes || "",
        });
      }
    },
    [salon, form],
  );

  function onSubmit(data) {
    updateSettings.mutate(
      {
        salonId: params.salonId,
        data: data,
      },
      {
        onSuccess: function () {
          toast({ title: "Settings saved" });
        },
        onError: function (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  }

  function handlePhotoUpload(event) {
    var file = event.target.files?.[0];
    if (!file) return;

    uploadPhoto.mutate(
      {
        salonId: params.salonId,
        file: file,
        type: "gallery",
      },
      {
        onSuccess: function () {
          toast({ title: "Photo uploaded" });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        onError: function (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleDeletePhoto(photoId) {
    deletePhoto.mutate(
      {
        salonId: params.salonId,
        photoId: photoId,
      },
      {
        onSuccess: function () {
          toast({ title: "Photo deleted" });
        },
        onError: function (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleDeleteSalon(force) {
    deleteSalon.mutate(
      {
        salonId: params.salonId,
        force: force,
      },
      {
        onSuccess: function () {
          toast({ title: "Salon deleted successfully" });
          setDeleteDialogOpen(false);
          router.push("/dashboard/settings");
        },
        onError: function (error) {
          if (error.blockers && error.blockers.length > 0) {
            setDeleteBlockers(error.blockers);
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="space-y-6">
           <div className="h-64 bg-muted/40 rounded-3xl" />
           <div className="h-64 bg-muted/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 mb-8 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <Building2 className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>General Configuration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Business Profile</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Manage your core salon details, contact information, and operating address visible to your clients.
          </p>
        </div>
      </motion.div>

      <Form {...form}>
        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-8"
        >
          {/* Basic Info */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Basic Information</h2>
                <p className="text-sm text-muted-foreground">Public details displayed to clients</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Salon Name</FormLabel>
                        <FormControl>
                          <Input className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50" {...field} placeholder="Your Salon Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          Currency
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "EUR"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-base">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="CAD">CAD ($)</SelectItem>
                            <SelectItem value="AUD">AUD ($)</SelectItem>
                            <SelectItem value="DZD">DZD (DA)</SelectItem>
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
                name="description"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[120px] rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 resize-y"
                          {...field}
                          placeholder="Tell clients about your salon..."
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description that appears on your booking page and public listing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Contact Details</h2>
                <p className="text-sm text-muted-foreground">How clients can reach out to you</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          {...field}
                          type="email"
                          placeholder="contact@salon.com"
                        />
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
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input 
                          className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          {...field} 
                          placeholder="+1 234 567 8900" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="website"
                render={function ({ field }) {
                  return (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        Website Target
                      </FormLabel>
                      <FormControl>
                        <Input 
                          className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          {...field} 
                          placeholder="https://yoursalon.com" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </motion.div>

          {/* Location Info */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Location</h2>
                <p className="text-sm text-muted-foreground">Physical address for clients navigating to you</p>
              </div>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={function ({ field }) {
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Street Address</FormLabel>
                      <FormControl>
                        <Input 
                          className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          {...field} 
                          placeholder="123 Main Street" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">City</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            {...field} 
                            placeholder="City" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">State / Province</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            {...field} 
                            placeholder="State" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">ZIP / Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            {...field} 
                            placeholder="12345" 
                          />
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
                        <FormLabel className="text-sm font-semibold">Country</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            {...field} 
                            placeholder="Country" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Photos */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
             <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Salon Gallery</h2>
                <p className="text-sm text-muted-foreground">Add photos to showcase your space and work</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(salon?.photos || []).map(function (photo) {
                return (
                  <motion.div
                    key={photo.id}
                    whileHover={{ scale: 1.02 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden shadow-sm border border-border/50"
                  >
                    <img
                      src={photo.url}
                      alt="Salon photo"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={function () {
                          handleDeletePhoto(photo.id);
                        }}
                        className="h-10 w-10 bg-destructive/90 text-white rounded-full flex items-center justify-center hover:bg-destructive hover:scale-110 transition-all shadow-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Upload Button */}
              <label className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm border border-border/50">
                  <ImagePlus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">Add Photo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </motion.div>

          {/* Sticky Submit Bar */}
          <motion.div 
            variants={itemVariants}
            className="sticky bottom-6 z-20"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl shadow-black/5">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Modifications map globally in real-time.</span>
              <Button 
                type="submit" 
                disabled={updateSettings.isPending}
                size="lg"
                className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              >
                {updateSettings.isPending ? "Syncing..." : "Publish Application Changes"}
              </Button>
            </div>
          </motion.div>
        </motion.form>
      </Form>

      {/* Danger Zone */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-16 bg-destructive/5 border border-destructive/20 rounded-3xl overflow-hidden"
      >
        <div className="p-6 sm:p-8">
           <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-destructive">Danger Zone</h2>
              <p className="text-sm text-destructive/80">Irreversible and destructive actions</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-background rounded-2xl border border-destructive/20 shadow-sm gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-base">Delete this salon</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Once deleted, all data associated with this salon including bookings, staff, and configurations will be permanently removed.
              </p>
            </div>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={function (open) {
                setDeleteDialogOpen(open);
                if (!open) {
                  setDeleteBlockers(null);
                  setConfirmDeleteText("");
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="rounded-xl shrink-0 w-full md:w-auto">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete Business
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-xl">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    Confirm Deletion
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4 text-base pt-2">
                      {deleteBlockers && deleteBlockers.length > 0 ? (
                        <div className="space-y-4">
                          <p className="font-semibold text-destructive">
                            Cannot delete salon. Please resolve the following issues:
                          </p>
                          <ul className="space-y-2 bg-destructive/5 p-4 rounded-xl border border-destructive/10">
                            {deleteBlockers.map(function (blocker, index) {
                              return (
                                <li
                                  key={index}
                                  className="flex items-start gap-3"
                                >
                                  <span className="text-destructive mt-0.5">•</span>
                                  <span className="text-sm font-medium">{blocker.message}</span>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="text-sm text-muted-foreground">
                            You can force delete by clicking <strong className="text-foreground">Force Delete</strong> below, which will cancel pending bookings automatically.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p>
                            Are you sure you want to delete <strong className="text-foreground">{salon?.name}</strong>? This action cannot be undone.
                          </p>
                          <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-xl">
                            All bookings, services, staff records, and other data associated with this salon will be removed.
                          </p>
                          <div className="space-y-2 pt-2">
                            <label className="text-sm font-bold text-foreground">
                              Type <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md select-all font-mono">{salon?.name}</span> to confirm:
                            </label>
                            <Input
                              className="h-12 rounded-xl text-base focus-visible:ring-destructive/50"
                              value={confirmDeleteText}
                              onChange={function (e) {
                                setConfirmDeleteText(e.target.value);
                              }}
                              placeholder={salon?.name || "Salon name"}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-3">
                  <AlertDialogCancel className="rounded-xl h-12 w-full sm:w-auto">Cancel</AlertDialogCancel>
                  {deleteBlockers && deleteBlockers.length > 0 ? (
                    <Button
                      variant="destructive"
                      className="rounded-xl h-12 w-full sm:w-auto"
                      onClick={function () {
                        handleDeleteSalon(true);
                      }}
                      disabled={deleteSalon.isPending}
                    >
                      {deleteSalon.isPending ? "Processing..." : "Force Delete"}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="rounded-xl h-12 w-full sm:w-auto"
                      onClick={function () {
                        handleDeleteSalon(false);
                      }}
                      disabled={
                        confirmDeleteText !== salon?.name ||
                        deleteSalon.isPending
                      }
                    >
                      {deleteSalon.isPending ? "Processing..." : "Delete Salon"}
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
