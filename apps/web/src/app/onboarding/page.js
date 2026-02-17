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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  price: z.number().min(0, "Price must be positive"),
});

const STEPS = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Salon Details", icon: Store },
  { id: 3, title: "Services", icon: Scissors },
  { id: 4, title: "Team", icon: Users },
  { id: 5, title: "Complete", icon: CheckCircle2 },
];

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

  const progress = (currentStep / STEPS.length) * 100;

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

  const handleSalonSubmit = (data) => {
    setSalonData(data);
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

    // Reset form
    setServiceName("");
    setServiceDuration(30);
    setServicePrice(50);
  };

  const handleRemoveService = (id) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleServicesNext = () => {
    // No backend call, just go to next step
    handleNext();
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

  const handleStaffNext = () => {
    // No backend call, just go to next step
    handleNext();
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

  const StepIcon = STEPS[currentStep - 1].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <StepIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {STEPS[currentStep - 1].title}
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1",
                  index < currentStep - 1 && "text-primary",
                  index === currentStep - 1 && "text-foreground",
                  index > currentStep - 1 && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    index < currentStep - 1 &&
                    "bg-primary text-primary-foreground",
                    index === currentStep - 1 &&
                    "bg-primary/20 text-primary border-2 border-primary",
                    index > currentStep - 1 && "bg-muted"
                  )}
                >
                  {index < currentStep - 1 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-6 py-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Welcome to Fresh! 👋</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Let&apos;s get your salon set up in just a few steps. This will
                    only take a couple of minutes, and you can always customize
                    everything later.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <Store className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Create Salon</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your salon details
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <Scissors className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Add Services</h3>
                    <p className="text-sm text-muted-foreground">
                      List what you offer
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Invite Team</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your staff members
                    </p>
                  </div>
                </div>

                <Button size="lg" onClick={handleNext} className="mt-8">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Salon Details */}
            {currentStep === 2 && (
              <Form {...salonForm}>
                <form
                  onSubmit={salonForm.handleSubmit(handleSalonSubmit)}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Tell us about your salon
                    </h3>

                    <div className="space-y-4">
                      <FormField
                        control={salonForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salon Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="My Beautiful Salon"
                                disabled={isLoading}
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell clients about your salon..."
                                rows={3}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormDescription>
                              A brief description that will be displayed to your
                              clients
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={salonForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="contact@salon.com"
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
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="+1 234 567 8900"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">Location</h3>
                    <div className="space-y-4">
                      <FormField
                        control={salonForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123 Main Street"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={salonForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Paris"
                                  disabled={isLoading}
                                />
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
                              <FormLabel className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5" />
                                Country *
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
                                      <SelectTrigger className="w-full">
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
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Services */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Add Your Services
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add the services you offer. You can always add more later.
                  </p>

                  {/* Add Service Form */}
                  <div className="border rounded-lg p-4 space-y-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Service Name *
                        </label>
                        <Input
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          placeholder="Haircut"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Duration (min) *
                        </label>
                        <Input
                          type="number"
                          value={serviceDuration}
                          onChange={(e) =>
                            setServiceDuration(parseInt(e.target.value))
                          }
                          min="5"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Price ($) *
                        </label>
                        <Input
                          type="number"
                          value={servicePrice}
                          onChange={(e) =>
                            setServicePrice(parseFloat(e.target.value))
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddService}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Service
                    </Button>
                  </div>

                  {/* Services List */}
                  {services.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {services.length} service(s) added:
                      </p>
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.duration} min • ${service.price}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveService(service.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {services.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        No services added yet. You can skip this step and add
                        them later.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleServicesNext} disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {services.length === 0 ? "Skip" : "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Team Members */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Invite Your Team
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send invitations to your staff members. They&apos;ll receive an
                    email to join your salon.
                  </p>

                  {/* Add Staff Form */}
                  <div className="border rounded-lg p-4 space-y-4 mb-4">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff@email.com"
                        className="flex-1"
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddStaff()
                        }
                      />
                      <Button
                        type="button"
                        onClick={handleAddStaff}
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Staff List */}
                  {staffMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {staffMembers.length} invitation(s) to send:
                      </p>
                      {staffMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <p className="font-medium">{member.email}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStaff(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {staffMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        No staff members added yet. You can skip this step and
                        invite them later.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleStaffNext} disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {staffMembers.length === 0 ? "Skip" : "Send Invitations"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="text-center space-y-6 py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">You&apos;re All Set! 🎉</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your salon is now ready to accept bookings. You can start
                    managing appointments right away!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
                  <div className="p-4 rounded-lg border bg-card">
                    <Store className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Salon Created</p>
                    <p className="text-sm text-muted-foreground">
                      Ready to go!
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <Scissors className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">{services.length} Services</p>
                    <p className="text-sm text-muted-foreground">
                      Added to your salon
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">
                      {staffMembers.length} Invitations
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sent to staff
                    </p>
                  </div>
                </div>

                <Button size="lg" onClick={handleComplete} className="mt-8">
                  Go to Dashboard
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
