"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Store, User as UserIcon, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { COUNTRIES } from "@/lib/constants/countries";

const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters"),
    last_name: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*]/,
        "Password must contain at least one special character (!@#$%^&*)"
      ),
    country: z.string().optional(),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => {
    // If it's a professional registration (would need authType context here, but schema usually doesn't have it easily)
    // We can handle the requirement in the form logic or refine it further if we pass the type.
    // For now, we'll keep it optional in schema and validate in submission or use a more dynamic schema creator.
    return true;
  });

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const authType = searchParams.get("type") || "customer";
  const isProfessionalPath = authType === "professional";
  const role = isProfessionalPath ? "owner" : "client";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      country: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError("");
    try {
      const { confirm_password, ...registerData } = data;

      // Validation for professional path
      if (isProfessionalPath && !data.country) {
        toast.error("Please select your country to continue business registration.");
        return;
      }

      // Include the role in the registration payload
      await registerUser({ ...registerData, role });

      toast.success(isProfessionalPath ? "Business account created! Let's set up your salon. 🚀" : "Account created successfully! 🎉");

      // Redirect based on role
      if (isProfessionalPath) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (error) {
      const message = error.message || "Failed to create account";
      setServerError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <Card className={isProfessionalPath ? "border-accent shadow-accent/5 shadow-2xl" : "shadow-xl border-border/50"}>
      <CardHeader className="space-y-1">
        {isProfessionalPath && (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2 mx-auto">
            <Store className="text-accent w-5 h-5" />
          </div>
        )}
        <CardTitle className={`text-2xl text-center font-bold ${isProfessionalPath ? "text-accent" : ""}`}>
          {isProfessionalPath ? "Register your business" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-center">
          {isProfessionalPath
            ? "Join Fresh to manage your salon and grow your business"
            : "Enter your details to start booking appointments"
          }
        </CardDescription>
        {isProfessionalPath && (
          <div className="flex items-center justify-center gap-2 mt-2 px-3 py-1.5 bg-accent/10 rounded-full w-fit mx-auto border border-accent/20">
            <Store className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-accent uppercase tracking-wider font-bold">Business Partner</span>
          </div>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Server Error Alert */}
          {serverError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              <strong>Error:</strong> {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                placeholder="John"
                disabled={isLoading}
                {...register("first_name")}
                className={errors.first_name ? "border-destructive" : (isProfessionalPath ? "focus-visible:ring-accent" : "")}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                disabled={isLoading}
                {...register("last_name")}
                className={errors.last_name ? "border-destructive" : (isProfessionalPath ? "focus-visible:ring-accent" : "")}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isLoading}
              {...register("email")}
              className={errors.email ? "border-destructive" : (isProfessionalPath ? "focus-visible:ring-accent" : "")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              disabled={isLoading}
              {...register("phone")}
              className={isProfessionalPath ? "focus-visible:ring-accent" : ""}
            />
          </div>

          {isProfessionalPath && (
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Country
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.country ? "border-destructive w-full" : "focus-visible:ring-accent w-full"}>
                      <SelectValue placeholder="Select your country" />
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
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                We need your country to adapt the experience to your local market regulations.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password")}
              className={errors.password ? "border-destructive" : (isProfessionalPath ? "focus-visible:ring-accent" : "")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirm_password")}
              className={errors.confirm_password ? "border-destructive" : (isProfessionalPath ? "focus-visible:ring-accent" : "")}
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className={`w-full h-11 font-medium ${isProfessionalPath ? "bg-accent hover:bg-accent/90 text-accent-foreground font-bold" : ""}`}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProfessionalPath ? "Create Business Account" : "Create Account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={isProfessionalPath ? "/login?type=professional" : "/login?type=customer"}
              className={`font-semibold hover:underline ${isProfessionalPath ? "text-accent" : "text-primary"}`}
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
