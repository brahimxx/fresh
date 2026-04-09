"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Store, Globe, CheckCircle2, ChevronRight, Sparkles, Building, Scissors, CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { COUNTRIES } from "@/lib/constants/countries";

const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required").min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(1, "Last name is required").min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[!@#$%^&*]/, "Password must contain at least one special character (!@#$%^&*)"),
    country: z.string().optional(),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const authType = searchParams.get("type") || "customer";
  const [selectedRole, setSelectedRole] = useState(authType === "professional" ? "owner" : "client");
  const isProfessionalPath = selectedRole === "owner";
  
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", country: "", password: "", confirm_password: "" },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setServerError("");
      const payload = { ...data, type: "customer" };
      if (isProfessionalPath) {
        payload.type = "owner";
        if (!data.country) {
          setServerError("Please select your country to continue.");
          setIsLoading(false);
          return;
        }
      }
      const response = await registerUser(payload);
      if (response && response.error) {
        setServerError(response.error);
        return;
      }
      toast.success("Account created successfully", { description: "You are now logged in" });
      router.push(isProfessionalPath ? "/onboarding" : "/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      setServerError(error.message || "An unexpected error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className={`w-full transition-all duration-500 ease-in-out ${isProfessionalPath ? "max-w-4xl" : "max-w-md lg:max-w-[440px]"}`}>
      <Card className={`overflow-hidden border-0 shadow-2xl ${isProfessionalPath ? "bg-accent/5 ring-1 ring-accent/20" : "bg-card ring-1 ring-border/50"}`}>
        <div className={`flex flex-col ${isProfessionalPath ? "md:flex-row" : ""}`}>
          
          {/* Left Side: Marketing Content for Professionals */}
          {isProfessionalPath && (
            <div className="hidden md:flex md:w-[45%] bg-accent p-8 text-accent-foreground flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-medium tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  Fresh For Business
                </div>
                
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mt-4 leading-[1.15]">
                  Grow your salon, <br /> simplify your life.
                </h2>
                
                <p className="text-accent-foreground/90 text-sm lg:text-base leading-relaxed mt-2 mb-8 pr-4">
                  Join thousands of professionals completely managing bookings, staff, and payments all in one place.
                </p>

                <div className="space-y-4 pt-4 border-t border-accent-foreground/20">
                  <div className="flex gap-4">
                    <div className="mt-1 bg-white/10 p-2 rounded-lg shrink-0 h-fit">
                      <CalendarCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Zero Booking Clashes</h4>
                      <p className="text-xs text-accent-foreground/80 leading-snug pr-4">Smart calendar logic that seamlessly adapts to your busy team.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="mt-1 bg-white/10 p-2 rounded-lg shrink-0 h-fit">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Custom Digital Storefront</h4>
                      <p className="text-xs text-accent-foreground/80 leading-snug pr-4">Get a personalized booking widget your clients will deeply love.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 mt-8 pt-6 border-t border-accent-foreground/10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-accent bg-blue-400"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-accent bg-indigo-500"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-accent bg-purple-400"></div>
                  </div>
                  <p className="text-xs font-medium text-accent-foreground/90">Trusted by over <strong className="text-white">10k+</strong> salons globally.</p>
                </div>
              </div>
            </div>
          )}

          {/* Right Side: Shared Form */}
          <div className={`p-6 sm:p-8 flex-col flex ${isProfessionalPath ? "md:w-[55%] bg-card" : "w-full"}`}>
            <div className="mb-6 space-y-2 text-center md:text-left">
              <h1 className={`text-2xl font-bold tracking-tight ${isProfessionalPath ? "text-accent-foreground" : "text-foreground"}`}>
                {isProfessionalPath ? "Create Business Account" : "Create an Account"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isProfessionalPath ? "Fill in your personal details to get started. You'll structure your salon next." : "Enter your details to start booking appointments in seconds."}
              </p>
            </div>
            
            {/* Desktop elegant tabs alternative layout */}
            <div className="flex mb-8 border-b-2 border-muted w-full">
                <button type="button" onClick={() => setSelectedRole("client")} className={`flex-1 pb-2.5 text-sm font-bold transition-all border-b-2 -mb-0.5 ${!isProfessionalPath ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"}`}>
                    Client Signup
                </button>
                <button type="button" onClick={() => setSelectedRole("owner")} className={`flex-1 pb-2.5 text-sm font-bold transition-all border-b-2 -mb-0.5 ${isProfessionalPath ? "border-accent-foreground text-accent-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"}`}>
                    Professional Signup
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col w-full">
              {serverError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm font-medium mb-4">
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">First Name</Label>
                  <Input id="first_name" disabled={isLoading} {...register("first_name")} className={`h-11 shadow-sm ${errors.first_name ? "border-red-500 ring-red-500" : (isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : "focus-visible:ring-primary")}`} placeholder="Jane"/>
                  {errors.first_name && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Last Name</Label>
                  <Input id="last_name" disabled={isLoading} {...register("last_name")} className={`h-11 shadow-sm ${errors.last_name ? "border-red-500 ring-red-500" : (isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : "focus-visible:ring-primary")}`} placeholder="Doe"/>
                  {errors.last_name && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.last_name.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Email Address</Label>
                <div className="relative">
                  <Input id="email" type="email" autoComplete="email" disabled={isLoading} {...register("email")} className={`h-11 shadow-sm ${errors.email ? "border-red-500 ring-red-500" : (isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : "focus-visible:ring-primary")}`} placeholder="jane@example.com"/>
                  {errors.email && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email.message}</p>}
                </div>
              </div>

              {isProfessionalPath && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Phone</Label>
                    <Input id="phone" type="tel" disabled={isLoading} {...register("phone")} className={`h-11 shadow-sm ${isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : ""}`} placeholder="+1 234 567 890"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80 uppercase tracking-wider">
                      Business Country
                    </Label>
                    <Controller
                      name="country" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <SelectTrigger className={`h-11 shadow-sm w-full ${errors.country ? "border-red-500 ring-red-500" : "focus-visible:ring-accent focus-visible:border-accent"}`}>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[300px]">
                            {COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.country && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.country.message}</p>}
                  </div>
                </div>
              )}
              
              {!isProfessionalPath && (
                <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Phone (Optional)</Label>
                    <Input id="phone" type="tel" disabled={isLoading} {...register("phone")} className="h-11 shadow-sm focus-visible:ring-primary" placeholder="+1 234 567 890"/>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" disabled={isLoading} {...register("password")} className={`h-11 shadow-sm ${errors.password ? "border-red-500 ring-red-500" : (isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : "focus-visible:ring-primary")}`}/>
                  {errors.password && <p className="text-[11px] text-red-500 mt-1 font-medium leading-tight">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Confirm</Label>
                  <Input id="confirm_password" type="password" autoComplete="new-password" disabled={isLoading} {...register("confirm_password")} className={`h-11 shadow-sm ${errors.confirm_password ? "border-red-500 ring-red-500" : (isProfessionalPath ? "focus-visible:ring-accent focus-visible:border-accent" : "focus-visible:ring-primary")}`}/>
                  {errors.confirm_password && <p className="text-[11px] text-red-500 mt-1 font-medium leading-tight">{errors.confirm_password.message}</p>}
                </div>
              </div>

              <div className="pt-3 mt-auto">
                <Button type="submit" disabled={isLoading} className={`w-full h-12 text-[15px] font-bold shadow-lg transition-all active:scale-[0.98] ${isProfessionalPath ? "bg-accent-foreground hover:bg-accent-foreground/90 text-accent shadow-accent-foreground/25 hover:shadow-accent-foreground/40" : "shadow-primary/25 hover:shadow-primary/40 bg-primary hover:bg-primary/95 text-primary-foreground"}`}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isProfessionalPath ? "Start Your Business Account" : "Sign Up"}
                  {!isLoading && <ChevronRight className="ml-1 w-5 h-5 opacity-80" />}
                </Button>
                
                <p className="text-[13px] text-center text-muted-foreground mt-5 font-medium">
                  Already have an account?{" "}
                  <Link href={isProfessionalPath ? "/login?type=professional" : "/login?type=customer"} className={`font-semibold hover:underline ${isProfessionalPath ? "text-accent-foreground" : "text-primary"}`}>
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
            
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center flex-col items-center w-full min-h-[500px]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}