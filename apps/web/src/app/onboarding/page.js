"use client";

import { useState, useEffect } from "react";
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
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Globe,
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
});

const STEPS = [
  { id: 1, title: "Account setup", question: "Welcome to Fresh" },
  { id: 2, title: "Account setup", question: "What's your business name?" },
  { id: 3, title: "Location", question: "Where is your salon located?" },
  { id: 4, title: "Services", question: "What services do you offer?" },
  { id: 5, title: "Team", question: "Invite your team members" },
  { id: 6, title: "Complete", question: "You're all set!" },
];

// Theme-aware input class
const inputClass =
  "bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring h-12 rounded-xl";

export default function OnboardingPage() {
  const router = useRouter();
  const { checkAuth, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [salonData, setSalonData] = useState(null);
  const [services, setServices] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

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

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSalonNameSubmit = () => {
    const name = salonForm.getValues("name");
    if (!name || name.length < 2) {
      salonForm.setError("name", { message: "Business name must be at least 2 characters" });
      return;
    }
    handleNext();
  };

  const handleLocationSubmit = () => {
    const address = salonForm.getValues("address");
    const city = salonForm.getValues("city");
    const country = salonForm.getValues("country");

    let hasError = false;
    if (!address) { salonForm.setError("address", { message: "Address is required" }); hasError = true; }
    if (!city) { salonForm.setError("city", { message: "City is required" }); hasError = true; }
    if (!country) { salonForm.setError("country", { message: "Country is required" }); hasError = true; }
    if (hasError) return;

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
      const salonRes = await api.post("/salons", salonData);
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
            })
          )
        );
      }

      // 3. Invite staff
      if (staffMembers.length > 0) {
        await Promise.all(
          staffMembers.map((member) =>
            api.post(`/salons/${newSalonId}/staff/invite`, {
              email: member.email,
            })
          )
        );
      }

      // Mark onboarding as completed
      localStorage.setItem("fresh_onboarding_completed", "true");

      // Refresh user role to 'owner'
      await checkAuth();

      toast.success("Welcome to Fresh! Your salon is ready! 🎉");
      router.push(`/dashboard/salon/${newSalonId}`);
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
    else if (currentStep === 3) handleLocationSubmit();
    else if (currentStep === 4) handleNext();
    else if (currentStep === 5) handleNext();
    else if (currentStep === 6) handleComplete();
  };

  const continueLabel = () => {
    if (currentStep === 1) return "Get Started";
    if (currentStep === 6) return isLoading ? "Creating..." : "Launch Dashboard";
    if (currentStep === 4 && services.length === 0) return "Skip";
    if (currentStep === 5 && staffMembers.length === 0) return "Skip";
    return "Continue";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col selection:bg-primary/30">
      {/* ─── Top Segmented Progress Bar ─────────────────────── */}
      <div className="max-w-7xl mx-auto w-full flex gap-1.5 px-4 sm:px-6 lg:px-8 pt-4">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className="flex-1 h-[5px] rounded-full overflow-hidden bg-muted"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                i < currentStep
                  ? "w-full bg-gradient-to-r from-primary to-violet-500"
                  : "w-0"
              )}
            />
          </div>
        ))}
      </div>

      {/* ─── Floating Navigation ────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5">
        {/* Back button */}
        <div>
          {currentStep > 1 && currentStep < STEPS.length && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          )}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          variant="outline"
          className="rounded-full border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 h-10 text-sm shadow-lg shadow-primary/20 cursor-pointer"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {continueLabel()}
          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* ─── Main Content ───────────────────────────────────── */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 sm:px-6 lg:px-8 pb-16">
        <div className="w-full max-w-2xl">

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Welcome</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Let&apos;s set up your salon on{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
                    Fresh
                  </span>
                </h1>
                <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg">
                  It only takes a few minutes. You&apos;ll create your salon profile, add services, and invite your team. Everything can be changed later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Store, title: "Create Salon", desc: "Add your details" },
                  { icon: Scissors, title: "Add Services", desc: "List what you offer" },
                  { icon: Users, title: "Invite Team", desc: "Bring your staff" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-4 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <Icon className="w-6 h-6 text-primary mb-2" />
                      <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Business Name */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Account setup</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  What&apos;s your business name?
                </h1>
                <p className="mt-3 text-zinc-400 text-base leading-relaxed">
                  This is the brand name your clients will see. Your billing and legal name can be added later.
                </p>
              </div>

              <Form {...salonForm}>
                <div className="space-y-5">
                  <FormField
                    control={salonForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Business name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder=""
                            className={inputClass}
                            disabled={isLoading}
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleSalonNameSubmit()}
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
                          Description <span className="text-muted-foreground font-normal">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Tell clients about your salon..."
                            rows={3}
                            className={cn(inputClass, "h-auto min-h-[80px] py-3")}
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
                            Email <span className="text-muted-foreground font-normal">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contact@salon.com" className={inputClass} disabled={isLoading} />
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
                            Phone <span className="text-muted-foreground font-normal">(Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="+1 234 567 8900" className={inputClass} disabled={isLoading} />
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

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Location</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Where is your salon located?
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  Your address will be used to show your salon on the map and help clients find you.
                </p>
              </div>

              <Form {...salonForm}>
                <div className="space-y-5">
                  <FormField
                    control={salonForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Street Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="123 Main Street"
                            className={inputClass}
                            disabled={isLoading}
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={salonForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Paris" className={inputClass} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salonForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            Country
                          </FormLabel>
                          <FormControl>
                            <Controller
                              name="country"
                              control={salonForm.control}
                              render={({ field }) => (
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={isLoading}
                                >
                                  <SelectTrigger className={cn(inputClass, "w-full")}>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent position="popper">
                                    {COUNTRIES.map((country) => (
                                      <SelectItem key={country.value} value={country.value}>
                                        {country.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
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

          {/* Step 4: Services */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Services</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  What services do you offer?
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  Add the services you offer. You can always add more later from your dashboard.
                </p>
              </div>

              {/* Add Service Form */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Service Name</label>
                    <Input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Haircut"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Duration (min)</label>
                    <Input
                      type="number"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(parseInt(e.target.value))}
                      min="5"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Price ($)</label>
                    <Input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(parseFloat(e.target.value))}
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
                    {services.length} service{services.length > 1 ? "s" : ""} added
                  </p>
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration} min &bull; ${service.price}
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Team</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Invite your team members
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  Send invitations to your staff. They&apos;ll receive an email to join your salon.
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
                    {staffMembers.length} invitation{staffMembers.length > 1 ? "s" : ""} to send
                  </p>
                  {staffMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <p className="font-medium text-foreground text-sm">{member.email}</p>
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

          {/* Step 6: Complete */}
          {currentStep === 6 && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  You&apos;re all set!
                </h1>
                <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                  Your salon is ready to accept bookings. Click below to launch your dashboard and start managing your business.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                {[
                  { icon: Store, title: "Salon Created", desc: "Ready to go" },
                  { icon: Scissors, title: `${services.length} Services`, desc: "Added" },
                  { icon: Users, title: `${staffMembers.length} Invitations`, desc: "To send" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center"
                    >
                      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="font-semibold text-sm text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
