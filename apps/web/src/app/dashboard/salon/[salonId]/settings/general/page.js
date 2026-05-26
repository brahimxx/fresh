"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Upload,
  X,
  AlertTriangle,
  Trash2,
  Info,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { CircleF, GoogleMap, useJsApiLoader } from "@react-google-maps/api";
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
  useDeleteSalon,
} from "@/hooks/use-settings";

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  scrollwheel: false,
  clickableIcons: false,
  gestureHandling: "greedy",
};

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
  mobile_base_address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
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
  isSameAsPhysical: z.boolean().optional(),
});

export default function GeneralSettingsPage() {
  var params = useParams();
  var router = useRouter();
  var { toast } = useToast();
  var mobileMapRef = useRef(null);
  var mobileGeocoderRef = useRef(null);
  var mobileCircleRef = useRef(null);
  var mobilePreviewRafRef = useRef(null);
  var [mobilePreviewCenter, setMobilePreviewCenter] = useState(null);
  var [localMobileCenter, setLocalMobileCenter] = useState(null);
  var [showManualAddress, setShowManualAddress] = useState(false);
  var physicalMapRef = useRef(null);
  var [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  var [deleteBlockers, setDeleteBlockers] = useState(null);
  var [confirmDeleteText, setConfirmDeleteText] = useState("");

  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var updateSettings = useUpdateSalonSettings();
  var deleteSalon = useDeleteSalon();
  var { isLoaded: isMapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  function toBoolFlag(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value === "1" || value === "true";
    return !!value;
  }

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
      mobile_base_address: "",
      latitude: null,
      longitude: null,
      virtual_meeting_link: "",
      travel_radius: 0,
      travel_fee_type: "none",
      travel_fee_amount: 0,
      min_booking_amount: 0,
      travel_buffer_time: 0,
      covered_zip_codes: "",
      isSameAsPhysical: true,
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
          is_physical: toBoolFlag(salon.is_physical, true),
          is_mobile: toBoolFlag(salon.is_mobile, false),
          is_virtual: toBoolFlag(salon.is_virtual, false),
          mobile_base_address: salon.mobile_base_address || "",
          latitude:
            salon.latitude !== null && salon.latitude !== undefined
              ? Number(salon.latitude)
              : null,
          longitude:
            salon.longitude !== null && salon.longitude !== undefined
              ? Number(salon.longitude)
              : null,
          virtual_meeting_link: salon.virtual_meeting_link || "",
          travel_radius: salon.travel_radius ?? 0,
          travel_fee_type: salon.travel_fee_type ?? "none",
          travel_fee_amount: salon.travel_fee_amount ?? 0,
          min_booking_amount: salon.min_booking_amount ?? 0,
          travel_buffer_time: salon.travel_buffer_time ?? 0,
          covered_zip_codes: salon.covered_zip_codes || "",
          isSameAsPhysical: toBoolFlag(salon.is_physical, true) && (!salon.mobile_base_address || salon.mobile_base_address === salon.address),
        });
      }
    },
    [salon, form],
  );

  function onSubmit(data) {
    if (!data.is_physical && !data.is_mobile && !data.is_virtual) {
      toast({
        title: "Select at least one fulfillment mode",
        description: "Enable In-salon, Mobile, or Virtual before saving.",
        variant: "destructive",
      });
      return;
    }

    if (data.is_virtual && !data.virtual_meeting_link?.trim()) {
      form.setError("virtual_meeting_link", {
        type: "manual",
        message: "A meeting link is required to enable virtual services",
      });
      toast({
        title: "Meeting link required",
        description: "Please add a virtual meeting link (e.g. Google Meet, Zoom) to enable virtual services.",
        variant: "destructive",
      });
      return;
    }

    if (data.isSameAsPhysical) {
      data.mobile_base_address = data.address;
    }

    updateSettings.mutate(
      {
        salonId: params.salonId,
        data: data,
      },
      {
        onSuccess: function (response) {
          toast({ title: "Settings saved" });
          // Notify about cascaded service changes
          var cascade = response?.data?.cascadeInfo;
          if (cascade?.virtualServicesAffected) {
            toast({
              title: "Virtual services updated",
              description: cascade.virtualServicesAffected + " service" + (cascade.virtualServicesAffected > 1 ? "s" : "") + " had virtual mode removed." + (cascade.virtualOnlyConverted > 0 ? " " + cascade.virtualOnlyConverted + " virtual-only service" + (cascade.virtualOnlyConverted > 1 ? "s were" : " was") + " switched to in-salon." : ""),
            });
          }
          if (cascade?.mobileServicesAffected) {
            toast({
              title: "Mobile services updated",
              description: cascade.mobileServicesAffected + " service" + (cascade.mobileServicesAffected > 1 ? "s" : "") + " had mobile mode removed." + (cascade.mobileOnlyConverted > 0 ? " " + cascade.mobileOnlyConverted + " mobile-only service" + (cascade.mobileOnlyConverted > 1 ? "s were" : " was") + " switched to in-salon." : ""),
            });
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

  function updateMobileBaseAddressFromCoords(lat, lng) {
    if (
      typeof window === "undefined" ||
      !window.google?.maps?.Geocoder ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    if (!mobileGeocoderRef.current) {
      mobileGeocoderRef.current = new window.google.maps.Geocoder();
    }

    mobileGeocoderRef.current.geocode(
      { location: { lat: lat, lng: lng } },
      function (results, status) {
        if (
          status === "OK" &&
          results &&
          results[0] &&
          results[0].formatted_address
        ) {
          form.setValue("mobile_base_address", results[0].formatted_address, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      },
    );
  }

  function handleMobileMapDragEnd() {
    if (!mobileMapRef.current) return;
    var center = mobileMapRef.current.getCenter();
    var nextLat = center.lat();
    var nextLng = center.lng();
    setMobilePreviewCenter({ lat: nextLat, lng: nextLng });
    setLocalMobileCenter({ lat: nextLat, lng: nextLng });
    updateMobileBaseAddressFromCoords(nextLat, nextLng);
  }

  function handleMobileMapCenterChanged() {
    if (!mobileMapRef.current) return;

    if (mobilePreviewRafRef.current) return;
    mobilePreviewRafRef.current = window.requestAnimationFrame(function () {
      mobilePreviewRafRef.current = null;
      if (!mobileMapRef.current) return;
      var center = mobileMapRef.current.getCenter();
      var nextLat = center.lat();
      var nextLng = center.lng();
      setMobilePreviewCenter(function (prev) {
        if (
          prev &&
          Math.abs(prev.lat - nextLat) < 0.000001 &&
          Math.abs(prev.lng - nextLng) < 0.000001
        ) {
          return prev;
        }
        return { lat: nextLat, lng: nextLng };
      });
    });
  }

  function handleMobileCircleLoad(circle) {
    // Keep a single live overlay to avoid ghost circles while dragging.
    if (mobileCircleRef.current && mobileCircleRef.current !== circle) {
      mobileCircleRef.current.setMap(null);
    }
    mobileCircleRef.current = circle;
  }

  function handleMobileCircleUnmount(circle) {
    if (mobileCircleRef.current === circle) {
      mobileCircleRef.current = null;
    }
    circle.setMap(null);
  }

  useEffect(function () {
    return function () {
      if (mobilePreviewRafRef.current) {
        window.cancelAnimationFrame(mobilePreviewRafRef.current);
        mobilePreviewRafRef.current = null;
      }
      if (mobileCircleRef.current) {
        mobileCircleRef.current.setMap(null);
        mobileCircleRef.current = null;
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  var isMobileEnabled = !!form.watch("is_mobile");
  var isVirtualEnabled = !!form.watch("is_virtual");
  var isPhysicalEnabled = !!form.watch("is_physical");
  var isSameAsPhysical = !!form.watch("isSameAsPhysical");
  var travelRadius = Number(form.watch("travel_radius") || 0);

  function toFiniteCoord(value) {
    if (value === null || value === undefined || value === "") return null;
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  var physicalLat = toFiniteCoord(form.watch("latitude"));
  var physicalLng = toFiniteCoord(form.watch("longitude"));
  var hasPhysicalCoords = physicalLat !== null && physicalLng !== null;

  useEffect(
    function () {
      if (isSameAsPhysical && hasPhysicalCoords) {
        setMobilePreviewCenter({ lat: physicalLat, lng: physicalLng });
      } else if (localMobileCenter) {
        setMobilePreviewCenter(localMobileCenter);
      } else if (hasPhysicalCoords) {
        setMobilePreviewCenter({ lat: physicalLat, lng: physicalLng });
      } else {
        setMobilePreviewCenter(null);
      }
    },
    [isSameAsPhysical, hasPhysicalCoords, physicalLat, physicalLng, localMobileCenter],
  );

  var mobileMapCenter = useMemo(
    function () {
      if (isSameAsPhysical && hasPhysicalCoords) {
        return { lat: physicalLat, lng: physicalLng };
      }
      if (localMobileCenter) {
        return localMobileCenter;
      }
      if (hasPhysicalCoords) {
        return { lat: physicalLat, lng: physicalLng };
      }
      return { lat: 36.7056, lng: 3.0906 };
    },
    [isSameAsPhysical, hasPhysicalCoords, physicalLat, physicalLng, localMobileCenter],
  );

  var mobileCircleCenter = useMemo(
    function () {
      if (mobilePreviewCenter) {
        return mobilePreviewCenter;
      }
      return mobileMapCenter;
    },
    [mobilePreviewCenter, mobileMapCenter],
  );

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

  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Decorative Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <Building2
            className="w-48 h-48 sm:w-64 sm:h-64 text-primary"
            strokeWidth={1}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>General Configuration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Business Profile
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Manage your core salon details, contact information, and operating
            address visible to your clients.
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
          <motion.div
            variants={itemVariants}
            className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Basic Information
                </h2>
                <p className="text-sm text-muted-foreground">
                  Public details displayed to clients
                </p>
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
                        <FormLabel className="text-sm font-semibold">
                          Salon Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            {...field}
                            placeholder="Your Salon Name"
                          />
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
                      <FormLabel className="text-sm font-semibold">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[120px] rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 resize-y"
                          {...field}
                          placeholder="Tell clients about your salon..."
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description that appears on your booking page
                        and public listing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            variants={itemVariants}
            className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Contact Details
                </h2>
                <p className="text-sm text-muted-foreground">
                  How clients can reach out to you
                </p>
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
          <motion.div
            variants={itemVariants}
            className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Location</h2>
                <p className="text-sm text-muted-foreground">
                  Physical address for clients navigating to you
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Storefront Location</label>
                <AddressAutocomplete
                  placeholder="Search for your storefront address"
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                  onChange={function (location) {
                    form.setValue("address", location.full_address || "", { shouldDirty: true });
                    form.setValue("city", location.city || "", { shouldDirty: true });
                    form.setValue("state", location.state || "", { shouldDirty: true });
                    form.setValue("zip_code", location.postal_code || "", { shouldDirty: true });
                    form.setValue("country", location.country || "", { shouldDirty: true });
                    if (location.lat !== undefined && location.lng !== undefined) {
                      form.setValue("latitude", location.lat, { shouldDirty: true });
                      form.setValue("longitude", location.lng, { shouldDirty: true });
                    }
                  }}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={function () {
                      setShowManualAddress(!showManualAddress);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {showManualAddress ? "Hide manual inputs" : "Enter address manually"}
                  </button>
                </div>
              </div>

              {showManualAddress && (
                <div className="space-y-6 p-4 rounded-xl border border-border/60 bg-muted/10">
                  <FormField
                    control={form.control}
                    name="address"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Street Address
                          </FormLabel>
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
                            <FormLabel className="text-sm font-semibold">
                              City
                            </FormLabel>
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
                            <FormLabel className="text-sm font-semibold">
                              State / Province
                            </FormLabel>
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
                            <FormLabel className="text-sm font-semibold">
                              ZIP / Postal Code
                            </FormLabel>
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
                            <FormLabel className="text-sm font-semibold">
                              Country
                            </FormLabel>
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
              )}

              {hasPhysicalCoords && (
                <div className="mt-4">
                  <div className="mb-2">
                    <p className="text-sm font-semibold">Storefront Map</p>
                    <p className="text-xs text-muted-foreground">
                      Is the pin in the right location? Drag the pin to adjust your exact storefront entrance.
                    </p>
                  </div>
                  <div className="w-full h-72 bg-muted border border-border rounded-xl relative overflow-hidden flex items-center justify-center cursor-crosshair">
                    {isMapsLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={{ lat: physicalLat, lng: physicalLng }}
                        zoom={15}
                        options={MAP_OPTIONS}
                        onLoad={function (map) {
                          physicalMapRef.current = map;
                        }}
                        onUnmount={function () {
                          physicalMapRef.current = null;
                        }}
                        onDragEnd={function () {
                          if (!physicalMapRef.current) return;
                          var center = physicalMapRef.current.getCenter();
                          form.setValue("latitude", center.lat(), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("longitude", center.lng(), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#E5E3DF] opacity-50 flex items-center justify-center">
                        <div className="text-muted-foreground/30 font-semibold text-lg flex flex-col items-center">
                          <MapPin className="h-10 w-10 mb-2 opacity-50" />
                          Loading Map...
                        </div>
                      </div>
                    )}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                      <MapPin className="h-10 w-10 text-black -mt-10" />
                      <div className="h-2 w-3 bg-black/20 rounded-[100%] blur-[1px] mt-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fulfillment Modes */}
          <motion.div
            variants={itemVariants}
            className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Fulfillment Modes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose how clients can book your services
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="is_physical"
                render={function ({ field }) {
                  return (
                    <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-semibold">
                          In-Salon
                        </FormLabel>
                        <FormDescription>
                          Clients come to your physical location.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="is_mobile"
                render={function ({ field }) {
                  return (
                    <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-semibold">
                          Mobile
                        </FormLabel>
                        <FormDescription>
                          You travel to the client location.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />

              {isMobileEnabled && (
                <div className="grid md:grid-cols-2 gap-6 rounded-xl border border-border/60 p-4">
                  <FormField
                    control={form.control}
                    name="travel_radius"
                    render={function ({ field }) {
                      return (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">
                            Travel Radius (km)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {isPhysicalEnabled && (
                    <FormField
                      control={form.control}
                      name="isSameAsPhysical"
                      render={function ({ field }) {
                        return (
                          <FormItem className="md:col-span-2 flex items-center justify-between rounded-xl border border-border/60 p-4">
                            <div className="space-y-1">
                              <FormLabel className="text-sm font-semibold">
                                Use physical salon location as mobile base
                              </FormLabel>
                              <FormDescription>
                                Your mobile service center will be locked to your physical storefront.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={!!field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {travelRadius > 0 ? (
                    (!isPhysicalEnabled || !isSameAsPhysical) && (
                      <FormField
                        control={form.control}
                        name="mobile_base_address"
                        render={function ({ field }) {
                          return (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-sm font-semibold">
                                Mobile Service Center Address
                              </FormLabel>
                              <FormControl>
                                <AddressAutocomplete
                                  value={field.value || ""}
                                  placeholder="Search your mobile service center"
                                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                                  onChange={function (location) {
                                    field.onChange(location.full_address || "");
                                    if (
                                      location.lat !== undefined &&
                                      location.lng !== undefined
                                    ) {
                                      setLocalMobileCenter({ lat: location.lat, lng: location.lng });
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )
                  ) : (
                    <div className="md:col-span-2 rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      Choose a travel radius first to unlock center selection on
                      the map.
                    </div>
                  )}

                  {travelRadius > 0 && (
                    <div className="md:col-span-2">
                      <div className="mb-2">
                        <p className="text-sm font-semibold">
                          Service Area Map
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isPhysicalEnabled && isSameAsPhysical 
                            ? "Your mobile service area is locked to your physical storefront." 
                            : "Search for your base address or drag the pin to adjust the center."}
                          {" "}Radius: {travelRadius}km.
                        </p>
                      </div>
                      <div className="w-full h-72 bg-muted border border-border rounded-xl relative overflow-hidden flex items-center justify-center cursor-crosshair">
                        {isMapsLoaded ? (
                          <GoogleMap
                            mapContainerStyle={{
                              width: "100%",
                              height: "100%",
                            }}
                            center={mobileMapCenter}
                            zoom={hasPhysicalCoords || localMobileCenter ? 12 : 10}
                            options={{
                              ...MAP_OPTIONS,
                              gestureHandling: (isPhysicalEnabled && isSameAsPhysical) ? "none" : "greedy",
                            }}
                            onLoad={function (map) {
                              mobileMapRef.current = map;
                            }}
                            onUnmount={function () {
                              mobileMapRef.current = null;
                            }}
                            onCenterChanged={handleMobileMapCenterChanged}
                            onDragEnd={handleMobileMapDragEnd}
                          >
                            {mobileCircleCenter && (
                              <CircleF
                                key={`${travelRadius}:${mobileCircleCenter.lat}:${mobileCircleCenter.lng}`}
                                center={mobileCircleCenter}
                                radius={travelRadius * 1000}
                                options={{
                                  fillColor: "#2563eb",
                                  fillOpacity: 0.12,
                                  strokeColor: "#2563eb",
                                  strokeOpacity: 0.9,
                                  strokeWeight: 2,
                                }}
                                onLoad={handleMobileCircleLoad}
                                onUnmount={handleMobileCircleUnmount}
                              />
                            )}
                          </GoogleMap>
                        ) : (
                          <div className="absolute inset-0 bg-[#E5E3DF] opacity-50 flex items-center justify-center">
                            <div className="text-muted-foreground/30 font-semibold text-lg flex flex-col items-center">
                              <Globe className="h-10 w-10 mb-2 opacity-50" />
                              Loading Map...
                            </div>
                          </div>
                        )}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                          <MapPin className="h-10 w-10 text-black -mt-10" />
                          <div className="h-2 w-3 bg-black/20 rounded-[100%] blur-[1px] mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="travel_buffer_time"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Mobile Setup &amp; Parking Buffer (minutes)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="120"
                              step="5"
                              className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormDescription>
                            Extra time added to every mobile appointment for parking, unloading, and setup. This buffer is factored into availability checks to prevent scheduling conflicts.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="travel_fee_type"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Travel Fee Type
                          </FormLabel>
                          <Select
                            value={field.value || "none"}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/50 text-base">
                                <SelectValue placeholder="Select fee type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none">No fee</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="per_km">Per km</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="travel_fee_amount"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Travel Fee Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />



                  <FormField
                    control={form.control}
                    name="covered_zip_codes"
                    render={function ({ field }) {
                      return (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">
                            Covered ZIP Codes
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                              placeholder="10001, 10002, 10003"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional comma-separated postal codes you serve.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="is_virtual"
                render={function ({ field }) {
                  return (
                    <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-semibold">
                          Virtual
                        </FormLabel>
                        <FormDescription>
                          Services delivered by video call.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />

              {isVirtualEnabled && (
                <FormField
                  control={form.control}
                  name="virtual_meeting_link"
                  render={function ({ field }) {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Default Virtual Meeting Link *
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            placeholder="https://meet.google.com/your-room"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Required. Clients will join this link for virtual appointments.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
            </div>
          </motion.div>

          {/* Sticky Submit Bar — only show when form is dirty */}
          {form.formState.isDirty && (
          <motion.div 
            variants={itemVariants} 
            className="sticky bottom-6 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl shadow-black/5">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                You have unsaved changes.
              </span>
              <Button
                type="submit"
                disabled={updateSettings.isPending}
                size="lg"
                className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              >
                {updateSettings.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </motion.div>
          )}
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
              <h2 className="text-xl font-bold tracking-tight text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-destructive/80">
                Irreversible and destructive actions
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-background rounded-2xl border border-destructive/20 shadow-sm gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-base">Delete this salon</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Once deleted, all data associated with this salon including
                bookings, staff, and configurations will be permanently removed.
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
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-xl shrink-0 w-full md:w-auto"
                >
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
                            Cannot delete salon. Please resolve the following
                            issues:
                          </p>
                          <ul className="space-y-2 bg-destructive/5 p-4 rounded-xl border border-destructive/10">
                            {deleteBlockers.map(function (blocker, index) {
                              return (
                                <li
                                  key={index}
                                  className="flex items-start gap-3"
                                >
                                  <span className="text-destructive mt-0.5">
                                    •
                                  </span>
                                  <span className="text-sm font-medium">
                                    {blocker.message}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="text-sm text-muted-foreground">
                            You can force delete by clicking{" "}
                            <strong className="text-foreground">
                              Force Delete
                            </strong>{" "}
                            below, which will cancel pending bookings
                            automatically.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p>
                            Are you sure you want to delete{" "}
                            <strong className="text-foreground">
                              {salon?.name}
                            </strong>
                            ? This action cannot be undone.
                          </p>
                          <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-xl">
                            All bookings, services, staff records, and other
                            data associated with this salon will be removed.
                          </p>
                          <div className="space-y-2 pt-2">
                            <label className="text-sm font-bold text-foreground">
                              Type{" "}
                              <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md select-all font-mono">
                                {salon?.name}
                              </span>{" "}
                              to confirm:
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
                  <AlertDialogCancel className="rounded-xl h-12 w-full sm:w-auto">
                    Cancel
                  </AlertDialogCancel>
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
