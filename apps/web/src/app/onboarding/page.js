"use client";

import { motion, AnimatePresence } from "framer-motion";
import { encodeId } from "@/lib/id";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  Store,
  Scissors,
  User,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Globe,
  Activity,
  Heart,
  Droplets,
  Flame,
  Bike,
  Dog,
  LayoutGrid,
  Eye,
  Crosshair,
  Glasses,
  Waves,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/lib/constants/countries";
import { formatDuration } from "@/lib/format";

import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
};

// Schemas
const salonSchema = z.object({
  name: z
    .string()
    .min(1, "Salon name is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  categories: z
    .array(z.string())
    .min(1, "Please select at least one category")
    .max(4, "You can select up to 4 categories"),
});

const STEPS = [
  { id: 1, title: "Account setup", question: "Welcome to Fresh" },
  { id: 2, title: "Account setup", question: "What's your business name?" },
  { id: 3, title: "Business type", question: "What type of business are you?" },
  { id: 4, title: "Account setup", question: "Select account type" },
  { id: 5, title: "Team", question: "Invite your team members" },
  { id: 6, title: "Location", question: "Where is your salon located?" },
  { id: 7, title: "Services", question: "What services do you offer?" },
  { id: 8, title: "Complete", question: "You're all set!" },
];

const BUSINESS_CATEGORIES = [
  { id: "Hair salon", label: "Hair salon", icon: Waves },
  { id: "Nails", label: "Nails", icon: Sparkles },
  { id: "Eyebrows & lashes", label: "Eyebrows & lashes", icon: Eye },
  { id: "Beauty salon", label: "Beauty salon", icon: Store },
  { id: "Medspa", label: "Medspa", icon: Sparkles },
  { id: "Barber", label: "Barber", icon: Scissors },
  { id: "Massage", label: "Massage", icon: Activity },
  { id: "Spa & sauna", label: "Spa & sauna", icon: Droplets },
  { id: "Waxing salon", label: "Waxing salon", icon: Flame },
  { id: "Tattooing & piercing", label: "Tattooing & piercing", icon: Heart },
  { id: "Tanning studio", label: "Tanning studio", icon: Glasses },
  { id: "Fitness & recovery", label: "Fitness & recovery", icon: Bike },
  { id: "Physical therapy", label: "Physical therapy", icon: Activity },
  { id: "Health practice", label: "Health practice", icon: Crosshair },
  { id: "Pet grooming", label: "Pet grooming", icon: Dog },
  { id: "Other", label: "Other", icon: LayoutGrid },
];

// Theme-aware input class
const inputClass =
  "bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring h-12 rounded-xl";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [locationTypes, setLocationTypes] = useState([]); // Array to hold [physical, mobile, virtual]
  const [showAddressForm, setShowAddressForm] = useState(false); // Sub-step boolean
  const [showAddressSearch, setShowAddressSearch] = useState(false); // Searching UI
  const [accountType, setAccountType] = useState(null);
  const [teamSize, setTeamSize] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [salonData, setSalonData] = useState(null);
  const [services, setServices] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Salon form
  const salonForm = useForm({
    resolver: zodResolver(salonSchema),
    defaultValues: {
      name: "",
      description: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      lat: undefined,
      lng: undefined,
      categories: [],
    },
  });

  // Pre-fill country from user profile
  useEffect(() => {
    if (user?.country && !salonForm.getValues("country")) {
      salonForm.setValue("country", user.country);
    }
  }, [user, salonForm]);

  // Service form for adding services
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState(50);

  // Staff email input
  const [staffEmail, setStaffEmail] = useState("");

  const [otherCategoryName, setOtherCategoryName] = useState("");

  const handleMapDragEnd = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      salonForm.setValue("lat", center.lat());
      salonForm.setValue("lng", center.lng());
    }
  };

  const handleNext = (overrideType) => {
    let type = typeof overrideType === "string" ? overrideType : accountType;
    let nextStep = currentStep + 1;
    if (currentStep === 4 && type === "independent") nextStep = 6;
    if (nextStep <= STEPS.length) {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    // Handle sub-step navigation for step 4 (Account type -> Team size)
    if (currentStep === 4 && accountType === "team") {
      setAccountType(null);
      setTeamSize(null);
      return;
    }
    // Handle sub-step navigation for step 5 (Location type -> Search -> Form)
    if (currentStep === 6) {
      if (showAddressForm) {
        setShowAddressForm(false);
        setShowAddressSearch(true);
        return;
      }
      if (showAddressSearch) {
        setShowAddressSearch(false);
        return;
      }
    }

    let prevStep = currentStep - 1;
    if (currentStep === 6 && accountType === "independent") prevStep = 4;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSalonNameSubmit = () => {
    const name = salonForm.getValues("name");
    if (!name || name.length < 2) {
      salonForm.setError("name", {
        message: "Business name must be at least 2 characters",
      });
      return;
    }
    handleNext();
  };

  const handleCategorySubmit = () => {
    const categories = salonForm.getValues("categories");
    if (!categories || categories.length === 0) {
      toast.error("Please select a business type");
      return;
    }
    if (categories.includes("Other") && !otherCategoryName.trim()) {
      toast.error("Please specify your business type");
      return;
    }

    // Replace "Other" with the custom name before saving
    if (categories.includes("Other") && otherCategoryName.trim()) {
      const idx = categories.indexOf("Other");
      if (idx !== -1) {
        categories[idx] = `Other: ${otherCategoryName.trim()}`;
        salonForm.setValue("categories", categories);
      }
    }

    handleNext();
  };

  const handleLocationSubmit = () => {
    if (locationTypes.length === 0) {
      toast.error("Please select at least one location type");
      return;
    }

    if (!showAddressSearch && !showAddressForm) {
      // Step 1: User chose location type(s)
      if (locationTypes.includes("physical")) {
        // Step 2: Show the Map Search Input screen
        setShowAddressSearch(true);
        return;
      } else {
        // Mobile/virtual only
        salonForm.setValue("address", "Mobile or Virtual Provider", {
          shouldValidate: false,
        });
        salonForm.setValue("city", "N/A", { shouldValidate: false });
        salonForm.setValue("country", "N/A", { shouldValidate: false });
        setSalonData(salonForm.getValues());
        handleNext();
        return;
      }
    }

    if (showAddressSearch && !showAddressForm) {
      // Step 3: From Search screen to full editable Map Form screen

      // Force user to select a location instead of filling dummy data
      if (!salonForm.getValues("address") || !salonForm.getValues("lat")) {
        toast.error(
          "Please search and select your business location to continue.",
        );
        return;
      }

      setShowAddressSearch(false);
      setShowAddressForm(true);
      return;
    }

    // Step 4: Full editable map & form screen submitting
    const address = salonForm.getValues("address");
    const city = salonForm.getValues("city");
    const country = salonForm.getValues("country");

    let hasError = false;
    if (!address) {
      salonForm.setError("address", { message: "Address is required" });
      hasError = true;
    }
    if (!city) {
      salonForm.setError("city", { message: "City is required" });
      hasError = true;
    }
    if (!country) {
      salonForm.setError("country", { message: "Country is required" });
      hasError = true;
    }

    // Since the form is visually hidden (display: none), let's surface errors via toast
    if (hasError) {
      toast.error("Please ensure your address, city, and country are complete");
      return;
    }

    setSalonData(salonForm.getValues());
    handleNext();
  };

  const handleAddService = () => {
    if (!serviceName || serviceDuration < 5 || servicePrice < 0) {
      toast.error("Please fill in all service fields correctly");
      return;
    }

    setServices([
      ...services,
      {
        id: Date.now(),
        name: serviceName,
        duration: serviceDuration,
        price: servicePrice,
      },
    ]);

    setServiceName("");
    setServiceDuration(30);
    setServicePrice(50);
  };

  const handleRemoveService = (id) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleAddStaff = () => {
    if (!staffEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) {
      toast.error("Please enter a valid email");
      return;
    }

    setStaffMembers([
      ...staffMembers,
      {
        id: Date.now(),
        email: staffEmail,
      },
    ]);

    setStaffEmail("");
  };

  const handleRemoveStaff = (id) => {
    setStaffMembers(staffMembers.filter((s) => s.id !== id));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // 1. Create salon
      const payload = {
        ...salonData,
        is_physical: locationTypes.includes("physical"),
        is_mobile: locationTypes.includes("mobile"),
        is_virtual: locationTypes.includes("virtual"),
      };

      const salonRes = await api.post("/salons", payload);
      const newSalonId = salonRes.data?.id || salonRes.id;

      // 2. Create services
      if (services.length > 0) {
        await Promise.all(
          services.map((service) =>
            api.post(`/salons/${newSalonId}/services`, {
              name: service.name,
              duration: service.duration,
              price: service.price,
              categoryId: null,
            }),
          ),
        );
      }

      // 3. Invite staff
      if (staffMembers.length > 0) {
        await Promise.all(
          staffMembers.map((member) =>
            api
              .post(`/salons/${newSalonId}/staff/invite`, {
                email: member.email,
              })
              .catch((err) => {
                // We catch per-invite so one failure doesn't block the whole onboarding completion
                toast.error(`For ${member.email}: ${err.message}`);
              }),
          ),
        );
      }

      // Mark onboarding as completed
      localStorage.setItem("fresh_onboarding_completed", "true");

      toast.success("Welcome to Fresh! Your salon is ready! 🎉");

      // Use a hard navigation instead of router.push to avoid a race condition.
      // router.push fires before React has re-rendered with the new 'owner' role
      // from checkAuth(), so the dashboard layout still sees role='client' and
      // redirects back to '/'. A full page reload reads the updated cookie from
      // scratch and mounts the dashboard with the correct auth state.
      window.location.href = `/dashboard/salon/${encodeId(newSalonId)}`;
    } catch (error) {
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine "Continue" action for the current step
  const handleContinue = () => {
    if (currentStep === 1) handleNext();
    else if (currentStep === 2) handleSalonNameSubmit();
    else if (currentStep === 3) handleCategorySubmit();
    else if (currentStep === 4) {
      if (accountType === "independent") handleNext();
      else if (accountType === "team" && teamSize) handleNext();
    } else if (currentStep === 5) handleNext();
    else if (currentStep === 6) handleLocationSubmit();
    else if (currentStep === 7) handleNext();
    else if (currentStep === 8) handleComplete();
  };

  const continueLabel = () => {
    if (currentStep === 1) return "Get Started";
    if (currentStep === 8)
      return isLoading ? "Creating..." : "Launch Dashboard";
    if (currentStep === 7 && services.length === 0) return "Skip";
    if (currentStep === 5 && staffMembers.length === 0) return "Skip";
    return "Continue";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col selection:bg-primary/30">
      {/* ─── Top Segmented Progress Bar ─────────────────────── */}
      <div className="max-w-7xl mx-auto w-full gap-2 px-4 sm:px-6 lg:px-8 pt-5 pb-1">
        {currentStep > 1 && (
          <div className="flex gap-2 w-full">
            {STEPS.filter(
              (step) =>
                step.id !== 1 &&
                !(accountType === "independent" && step.id === 5),
            ).map((step) => {
              const isActive = step.id === currentStep;
              const isPast = step.id < currentStep;

              // Calculate fill width per segmented bar based on step and sub-steps
              let fillWidth = "0%";
              let animationDelay = 0;

              if (isPast) {
                fillWidth = "100%";
                animationDelay = 0; // Past steps close out immediately without delay
              } else if (isActive) {
                // Sequence the animation: wait slightly for any past step to finish filling
                // so we don't have two separate bars animating simultaneously.
                animationDelay = 0.3;

                if (step.id === 4) {
                  // Step 4 has 2 sub-steps
                  fillWidth = accountType === "team" ? "100%" : "50%";
                } else if (step.id === 6) {
                  // Step 6 has 3 sub-steps (initial -> search -> edit map)
                  if (!showAddressSearch && !showAddressForm) fillWidth = "33%";
                  else if (showAddressSearch) fillWidth = "66%";
                  else fillWidth = "100%";
                } else {
                  // Normal single-page step
                  fillWidth = "100%";
                }
              }

              return (
                <div
                  key={step.id}
                  className="flex-1 h-[6px] rounded-full overflow-hidden bg-muted relative"
                >
                  <motion.div
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary to-violet-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: fillWidth }}
                    transition={{
                      duration: 0.3,
                      ease: "easeInOut",
                      delay: animationDelay,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Top Navigation ────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5">
        <div>
          {currentStep > 1 && currentStep < STEPS.length ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          ) : currentStep === 1 ? (
            <button
              onClick={() => router.push("/onboarding/choose")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Options
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < STEPS.length && (
            <button
              onClick={() => router.push("/")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-4 py-2 rounded-full hover:bg-muted"
            >
              Close
            </button>
          )}

          <Button
            onClick={handleContinue}
            disabled={isLoading}
            className="rounded-full shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 h-10 text-sm cursor-pointer transition-all duration-200"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {continueLabel()}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ─── Main Content ───────────────────────────────────── */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 sm:px-6 lg:px-8 pb-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Welcome
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                      Let&apos;s set up your salon on{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
                        Fresh
                      </span>
                    </h1>
                    <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg">
                      It only takes a few minutes. You&apos;ll create your salon
                      profile, add services, and invite your team. Everything
                      can be changed later.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        icon: Store,
                        title: "Create Salon",
                        desc: "Add your details",
                      },
                      {
                        icon: Scissors,
                        title: "Add Services",
                        desc: "List what you offer",
                      },
                      {
                        icon: Users,
                        title: "Invite Team",
                        desc: "Bring your staff",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="p-4 rounded-xl bg-muted/50 border border-border/50"
                        >
                          <Icon className="w-6 h-6 text-primary mb-2" />
                          <h3 className="font-semibold text-sm text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Business Name */}
              {currentStep === 2 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Account setup
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      What&apos;s your business name?
                    </h1>
                    <p className="mt-3 text-zinc-400 text-base leading-relaxed">
                      This is the brand name your clients will see. Your billing
                      and legal name can be added later.
                    </p>
                  </div>

                  <Form {...salonForm}>
                    <div className="space-y-5">
                      <FormField
                        control={salonForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground">
                              Business name
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder=""
                                className={inputClass}
                                disabled={isLoading}
                                autoFocus
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleSalonNameSubmit()
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={salonForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground">
                              Description{" "}
                              <span className="text-muted-foreground font-normal">
                                (Optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell clients about your salon..."
                                rows={3}
                                className={cn(
                                  inputClass,
                                  "h-auto min-h-[80px] py-3",
                                )}
                                disabled={isLoading}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={salonForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground">
                                Email{" "}
                                <span className="text-muted-foreground font-normal">
                                  (Optional)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="contact@salon.com"
                                  className={inputClass}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={salonForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground">
                                Phone{" "}
                                <span className="text-muted-foreground font-normal">
                                  (Optional)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="tel"
                                  placeholder="+1 234 567 8900"
                                  className={inputClass}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                </div>
              )}

              {/* Step 3: Category */}
              {currentStep === 3 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Business type
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      What type of business are you?
                    </h1>
                    <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                      Choose your primary and up to 3 related service types.
                    </p>
                  </div>

                  <Form {...salonForm}>
                    <FormField
                      control={salonForm.control}
                      name="categories"
                      render={({ field }) => {
                        const currentCategories = field.value || [];
                        const hasOther = currentCategories.includes("Other");

                        return (
                          <FormItem>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                              {BUSINESS_CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                // Check if selected normally or as a transformed "Other: xxx" string
                                const selectedIndex =
                                  currentCategories.findIndex(
                                    (c) =>
                                      c === cat.label ||
                                      (cat.label === "Other" &&
                                        c.startsWith("Other:")),
                                  );
                                const isSelected = selectedIndex !== -1;
                                const isMaxReached =
                                  currentCategories.length >= 4;
                                const isDisabled = !isSelected && isMaxReached;

                                const handleSelect = () => {
                                  if (isSelected) {
                                    field.onChange(
                                      currentCategories.filter(
                                        (_, i) => i !== selectedIndex,
                                      ),
                                    );
                                  } else {
                                    if (isMaxReached) {
                                      toast.error(
                                        "You can select up to 4 categories",
                                      );
                                      return;
                                    }
                                    field.onChange([
                                      ...currentCategories,
                                      cat.label,
                                    ]);
                                  }
                                };

                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={handleSelect}
                                    disabled={isDisabled}
                                    className={cn(
                                      "relative flex flex-col items-start p-4 text-left rounded-xl transition-all duration-200 border cursor-pointer",
                                      isSelected
                                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                        : "border-border/50 bg-muted/30 hover:bg-muted/80 hover:border-primary/30",
                                      isDisabled &&
                                        "opacity-50 cursor-not-allowed hover:bg-muted/30 hover:border-border/50",
                                    )}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                                        {selectedIndex === 0
                                          ? "Primary"
                                          : selectedIndex + 1}
                                      </div>
                                    )}
                                    <div
                                      className={cn(
                                        "p-2 rounded-lg mb-3 inline-flex",
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground",
                                        isDisabled &&
                                          "bg-muted text-muted-foreground/50",
                                      )}
                                    >
                                      <Icon className="w-5 h-5" />
                                    </div>
                                    <span
                                      className={cn(
                                        "font-medium text-sm md:text-base",
                                        isSelected
                                          ? "text-primary"
                                          : "text-foreground",
                                        isDisabled &&
                                          "text-muted-foreground/50",
                                      )}
                                    >
                                      {cat.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {hasOther && (
                              <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-semibold text-foreground block mb-2">
                                  Please specify
                                </label>
                                <Input
                                  value={otherCategoryName}
                                  onChange={(e) =>
                                    setOtherCategoryName(e.target.value)
                                  }
                                  placeholder="e.g. Dietitian, Chiropractor"
                                  className={inputClass}
                                />
                              </div>
                            )}
                            <FormMessage className="mt-4" />
                          </FormItem>
                        );
                      }}
                    />
                  </Form>
                </div>
              )}

              {/* Step 4: Account Type */}
              {currentStep === 4 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Account setup
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      {accountType !== "team"
                        ? "Select account type"
                        : "What is your team size?"}
                    </h1>
                    <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                      {accountType !== "team"
                        ? "Choose how you'll be using Fresh to manage your business."
                        : "This helps us personalize your team management experience."}
                    </p>
                  </div>

                  {accountType !== "team" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setAccountType("independent");
                          handleNext("independent");
                        }}
                        className={cn(
                          "p-6 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer group hover:border-primary/50 bg-background",
                          accountType === "independent"
                            ? "border-primary bg-primary/5"
                            : "border-border",
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">
                          I&apos;m an independent
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          I work alone and manage everything myself.
                        </p>
                      </button>

                      <button
                        onClick={() => setAccountType("team")}
                        className={cn(
                          "p-6 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer group hover:border-primary/50 bg-background",
                          accountType === "team"
                            ? "border-primary bg-primary/5"
                            : "border-border",
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">
                          It&apos;s a team
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          I have staff members working with me.
                        </p>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {["2-5", "6-10", "11-20", "20+"].map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setTeamSize(size);
                            handleNext();
                          }}
                          className={cn(
                            "p-6 rounded-xl border-2 text-center transition-all duration-200 font-medium hover:border-primary/50 cursor-pointer bg-background",
                            teamSize === size
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-foreground hover:bg-muted/50",
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Location */}
              {currentStep === 6 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Location
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      {!showAddressSearch && !showAddressForm
                        ? "Where do you provide your services?"
                        : "Set your venue's physical location"}
                    </h1>
                    <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                      {!showAddressSearch && !showAddressForm
                        ? "You can select multiple options if you offer hybrid services."
                        : "Add your primary business location so your clients can easily find you. Additional locations can be added later."}
                    </p>
                  </div>

                  {!showAddressSearch && !showAddressForm ? (
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          id: "physical",
                          label: "Clients come to me at a physical location",
                        },
                        {
                          id: "mobile",
                          label: "I visit my clients as a mobile operator",
                        },
                        {
                          id: "virtual",
                          label: "I provide virtual services online",
                        },
                      ].map((option) => {
                        const isSelected = locationTypes.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              if (isSelected) {
                                setLocationTypes(
                                  locationTypes.filter((t) => t !== option.id),
                                );
                              } else {
                                setLocationTypes([...locationTypes, option.id]);
                              }
                            }}
                            className={cn(
                              "p-5 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-between group hover:border-primary/50 bg-background",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border",
                            )}
                          >
                            <span className="font-semibold text-base">
                              {option.label}
                            </span>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/30",
                              )}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : locationTypes.includes("physical") &&
                    showAddressSearch &&
                    !showAddressForm ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <label className="text-base font-semibold text-foreground block">
                        Where&apos;s your business located?
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <AddressAutocomplete
                          placeholder="Start typing your address..."
                          className={cn(
                            inputClass,
                            "pl-11 border-muted-foreground/30 shadow-none",
                          )}
                          onChange={(location) => {
                            if (location.lat && location.lng) {
                              // A real suggestion was selected
                              salonForm.setValue(
                                "address",
                                location.full_address || "",
                              );
                              salonForm.setValue("lat", location.lat);
                              salonForm.setValue("lng", location.lng);

                              // Auto-fill City and Country using google's address_components
                              if (location.address_components) {
                                const cityObj =
                                  location.address_components.find(
                                    (c) =>
                                      c.types.includes("locality") ||
                                      c.types.includes("postal_town") ||
                                      c.types.includes(
                                        "administrative_area_level_2",
                                      ),
                                  );
                                const countryObj =
                                  location.address_components.find((c) =>
                                    c.types.includes("country"),
                                  );

                                if (cityObj)
                                  salonForm.setValue("city", cityObj.long_name);
                                // The application currently sets country by 2-letter ISO code to match Countries list values.
                                if (countryObj)
                                  salonForm.setValue(
                                    "country",
                                    countryObj.short_name,
                                  );
                              }

                              setShowAddressSearch(false);
                              setShowAddressForm(true);
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Select your location from the suggestions dropdown.
                      </p>
                    </div>
                  ) : locationTypes.includes("physical") && showAddressForm ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      {/* Address Summary Block */}
                      <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-muted/20">
                        <div>
                          <p className="text-foreground font-medium">
                            {salonForm.watch("address") ||
                              "Boulevard Ain Naadja"}
                          </p>
                          <p className="text-muted-foreground">
                            {salonForm.watch("city") || "Ain Naadja"}
                          </p>
                          <p className="text-muted-foreground">
                            {COUNTRIES.find(
                              (c) => c.value === salonForm.watch("country"),
                            )?.label || "Algeria"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddressForm(false);
                            setShowAddressSearch(true);
                          }}
                          className="rounded-full shadow-none bg-transparent hover:bg-muted font-medium text-xs h-8"
                        >
                          Edit
                        </Button>
                      </div>

                      {/* Map Pin Block */}
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">
                          Is the pin in the right location?
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Move the pin to your location if it&apos;s not quite
                          right.
                        </p>
                        <div className="w-full h-64 bg-muted border border-border rounded-xl relative overflow-hidden flex items-center justify-center cursor-crosshair">
                          {isLoaded ? (
                            <GoogleMap
                              mapContainerStyle={{
                                width: "100%",
                                height: "100%",
                              }}
                              center={{
                                lat: salonForm.getValues("lat") || 36.7056,
                                lng: salonForm.getValues("lng") || 3.0906,
                              }}
                              zoom={15}
                              options={MAP_OPTIONS}
                              onLoad={(map) => {
                                mapRef.current = map;
                              }}
                              onDragEnd={handleMapDragEnd}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[#E5E3DF] opacity-50 flex items-center justify-center">
                              <div className="text-muted-foreground/30 font-semibold text-lg flex flex-col items-center">
                                <Globe className="h-10 w-10 mb-2 opacity-50" />
                                Loading Map...
                              </div>
                            </div>
                          )}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                            <MapPin className="h-10 w-10 text-primary -mt-10" />
                            <div className="h-2 w-3 bg-black/20 rounded-[100%] blur-[1px] mt-1" />
                          </div>
                        </div>
                      </div>

                      {/* Hidden explicit Form to satisfy validation requirements on HandleComplete */}
                      <div className="hidden">
                        <Form {...salonForm}>
                          <FormField
                            control={salonForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={salonForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={salonForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </Form>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 7: Services */}
              {currentStep === 7 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Services
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      What services do you offer?
                    </h1>
                    <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                      Add the services you offer. You can always add more later
                      from your dashboard.
                    </p>
                  </div>

                  {/* Add Service Form */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">
                          Service Name
                        </label>
                        <Input
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          placeholder="Haircut"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">
                          Duration (min)
                        </label>
                        <Input
                          type="number"
                          value={serviceDuration}
                          onChange={(e) =>
                            setServiceDuration(parseInt(e.target.value))
                          }
                          min="5"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">
                          Price ($)
                        </label>
                        <Input
                          type="number"
                          value={servicePrice}
                          onChange={(e) =>
                            setServicePrice(parseFloat(e.target.value))
                          }
                          min="0"
                          step="0.01"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Service
                    </button>
                  </div>

                  {/* Services List */}
                  {services.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {services.length} service
                        {services.length > 1 ? "s" : ""} added
                      </p>
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {service.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(service.duration)} &bull; $
                              {service.price}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(service.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {services.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Scissors className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        No services added yet. You can skip this step.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Team */}
              {currentStep === 5 && (
                <div className="space-y-8 ">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Team</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      Invite your team members
                    </h1>
                    <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                      Send invitations to your staff. They&apos;ll receive an
                      email to join your salon.
                    </p>
                  </div>

                  {/* Add Staff Form */}
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="staff@email.com"
                      className={cn(inputClass, "flex-1")}
                      onKeyDown={(e) => e.key === "Enter" && handleAddStaff()}
                    />
                    <Button
                      type="button"
                      onClick={handleAddStaff}
                      variant="outline"
                      className="rounded-xl border-border bg-muted/50 text-foreground hover:bg-muted h-12 px-5 cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {/* Staff List */}
                  {staffMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {staffMembers.length} invitation
                        {staffMembers.length > 1 ? "s" : ""} to send
                      </p>
                      {staffMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                        >
                          <p className="font-medium text-foreground text-sm">
                            {member.email}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(member.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {staffMembers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        No team members added. You can skip this step.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 8: Complete */}
              {currentStep === 8 && (
                <div className="space-y-8 text-center ">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>

                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      You&apos;re all set!
                    </h1>
                    <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                      Your salon is ready to accept bookings. Click below to
                      launch your dashboard and start managing your business.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {[
                      {
                        icon: Store,
                        title: "Salon Created",
                        desc: "Ready to go",
                      },
                      {
                        icon: Scissors,
                        title: `${services.length} Services`,
                        desc: "Added",
                      },
                      {
                        icon: Users,
                        title: `${staffMembers.length} Invitations`,
                        desc: "To send",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center"
                        >
                          <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                          <p className="font-semibold text-sm text-foreground">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
