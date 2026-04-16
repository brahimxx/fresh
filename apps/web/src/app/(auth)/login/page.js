"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Store,
  Sparkles,
  UserPlus,
  LogIn,
  ArrowLeft,
} from "lucide-react";

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
import { useAuth } from "@/providers/auth-provider";
import api from "@/lib/api-client";

// Step 1 Schema: Just email
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

// Step 2 Schema: Login
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Step 3 Schema: Register
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
});

function UnifiedAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register: registerUser } = useAuth();

  const [step, setStep] = useState("email"); // 'email', 'login', 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null); // stores { firstName, avatarUrl } if exists
  const [serverError, setServerError] = useState("");
  const [showUpgradeState, setShowUpgradeState] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const redirectPath = searchParams.get("redirect") || "";
  const authType = searchParams.get("type") || "customer"; // 'customer' or 'professional'
  const isProfessionalPath = authType === "professional";
  const initialEmail = searchParams.get("email") || "";

  // The main form Hook, we dynamically switch the Zod resolver based on the step
  const currentSchema =
    step === "email"
      ? emailSchema
      : step === "login"
        ? loginSchema
        : registerSchema;

  const {
    register: formRegister,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: initialEmail,
      firstName: "",
      lastName: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const currentEmail = watch("email");

  // Step 1: Check Email
  const onCheckEmail = async (data) => {
    setIsLoading(true);
    setServerError("");
    try {
      const response = await api.post("/auth/check", { email: data.email });
      if (response && response.data) {
        if (response.data.exists) {
          setUserData(response.data);
          setStep("login");
        } else {
          setStep("register");
        }
      }
    } catch (error) {
      setServerError(
        error.message || "Failed to check email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Login
  const onLogin = async (data) => {
    setIsLoading(true);
    setServerError("");
    try {
      const response = await login(data.email, data.password);
      const user = response?.user || response;
      const userRole = user?.role;

      if (isProfessionalPath && userRole === "client") {
        setLoggedInUser(user);
        setShowUpgradeState(true);
        return;
      }

      toast.success("Welcome back!");

      if (redirectPath) {
        router.push(redirectPath);
      } else if (userRole === "admin") {
        router.push("/dashboard/admin");
      } else if (userRole === "owner" || userRole === "staff") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (error) {
      const msg = error.message || "Invalid email or password";
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes("incorrect password") ||
        lowerMsg.includes("password are required")
      ) {
        setError("password", { type: "manual", message: msg });
      } else {
        setServerError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Register
  const onRegister = async (data) => {
    setIsLoading(true);
    setServerError("");
    try {
      const payload = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      const response = await registerUser(payload);
      toast.success("Account created successfully", {
        description: "Welcome to Fresh!",
      });

      const token = searchParams.get("token");
      if (token) {
        router.push(`/invite?token=${token}`);
      } else {
        router.push(isProfessionalPath ? "/onboarding/choose" : "/dashboard");
      }
    } catch (error) {
      setServerError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch to the correct handler based on the step
  const onSubmit = (data) => {
    if (step === "email") {
      onCheckEmail(data);
    } else if (step === "login") {
      onLogin(data);
    } else if (step === "register") {
      onRegister(data);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await api.patch("/auth/upgrade", {});
      toast.success("Welcome to Fresh Professional!", {
        description: "Let's set up your salon.",
      });
      router.push("/onboarding/choose");
    } catch (error) {
      toast.error(error.message || "Failed to upgrade account");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isMounted) return <div className="min-h-[500px]" />;

  if (showUpgradeState) {
    return (
      <div className="w-full max-w-md">
        <Card className="border-accent">
          <CardHeader className="space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 mx-auto">
              <Store className="text-accent w-6 h-6" />
            </div>
            <CardTitle className="text-2xl text-center font-bold text-accent">
              Upgrade to Professional
            </CardTitle>
            <CardDescription className="text-center text-base">
              Hi {loggedInUser?.firstName || "there"}! You&apos;re logging into
              the professional platform. Would you like to upgrade your account
              to manage your own salon?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4 text-sm text-muted-foreground text-center">
            <p>This will allow you to:</p>
            <ul className="grid grid-cols-1 gap-2 text-left max-w-[240px] mx-auto">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Create
                your salon profile
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Manage
                services and staff
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Grow your
                business with Fresh
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
              onClick={handleUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade & Continue
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              disabled={isUpgrading}
            >
              Keep as customer only
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`w-full transition-all duration-500 ease-in-out ${isProfessionalPath ? "max-w-4xl" : "max-w-md lg:max-w-[440px]"}`}
    >
      <Card
        className={`overflow-hidden border-0 shadow-2xl ${isProfessionalPath ? "bg-accent/5 ring-1 ring-accent/20" : "bg-card ring-1 ring-border/50"}`}
      >
        <div
          className={`flex flex-col ${isProfessionalPath ? "md:flex-row" : ""}`}
        >
          {/* Left Side: Marketing Content for Professionals */}
          {isProfessionalPath && (
            <div className="hidden md:flex md:w-[45%] bg-accent p-8 text-accent-foreground flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-medium tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  Fresh For Business
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tight leading-tight pt-4">
                    Manage your salon on your own terms.
                  </h1>
                  <p className="text-accent-foreground/80 text-lg leading-relaxed">
                    Join the fastest-growing platform for beauty and wellness
                    professionals.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-12">
                <div className="flex -space-x-3 mb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-accent bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-bold overflow-hidden"
                    >
                      <img
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt={`User ${i}`}
                      />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-accent bg-white text-accent flex items-center justify-center text-xs font-bold shadow-lg">
                    10k+
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90">
                  Join 10,000+ top salons worldwide
                </p>
              </div>
            </div>
          )}

          {/* Right Side: Auth Form */}
          <div
            className={`bg-card p-6 sm:p-8 ${isProfessionalPath ? "md:w-[55%]" : "w-full"}`}
          >
            <div className="flex flex-col h-full justify-center space-y-6">
              {/* Header */}
              <div className="space-y-2 text-center md:text-left">
                {step !== "email" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("email")}
                    className="-ml-3 mb-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                )}

                {isProfessionalPath && step === "email" && (
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
                    <Store className="text-accent w-5 h-5" />
                  </div>
                )}

                <CardTitle
                  className={`text-2xl font-bold ${isProfessionalPath ? "text-accent" : ""}`}
                >
                  {step === "email" && "Welcome to Fresh"}
                  {step === "login" &&
                    `Welcome back${userData?.firstName ? `, ${userData.firstName}` : ""}`}
                  {step === "register" && "Create your account"}
                </CardTitle>

                <CardDescription>
                  {step === "email" &&
                    "Enter your email to log in or create a new account"}
                  {step === "login" &&
                    "Enter your password to access your account"}
                  {step === "register" &&
                    "We need a few more details to get started"}
                </CardDescription>
              </div>

              {serverError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Step 1: Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isLoading || step !== "email"}
                    {...formRegister("email")}
                    className={
                      isProfessionalPath ? "focus-visible:ring-accent" : ""
                    }
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Step 2: Login (Password) */}
                {step === "login" && (
                  <div className="space-y-2 translate-y-0 opacity-100 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className={`text-sm hover:underline ${isProfessionalPath ? "text-accent" : "text-primary"}`}
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      autoFocus
                      {...formRegister("password")}
                      className={
                        isProfessionalPath ? "focus-visible:ring-accent" : ""
                      }
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Step 3: Register (Name & Password) */}
                {step === "register" && (
                  <div className="space-y-4 translate-y-0 opacity-100 transition-all duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          placeholder="Jane"
                          disabled={isLoading}
                          autoFocus
                          {...formRegister("firstName")}
                          className={
                            isProfessionalPath
                              ? "focus-visible:ring-accent"
                              : ""
                          }
                        />
                        {errors.firstName && (
                          <p className="text-sm text-destructive">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          disabled={isLoading}
                          {...formRegister("lastName")}
                          className={
                            isProfessionalPath
                              ? "focus-visible:ring-accent"
                              : ""
                          }
                        />
                        {errors.lastName && (
                          <p className="text-sm text-destructive">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Create a password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...formRegister("password")}
                        className={
                          isProfessionalPath ? "focus-visible:ring-accent" : ""
                        }
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">
                          {errors.password.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Must be at least 8 characters with 1 uppercase letter.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full h-11 text-base ${isProfessionalPath ? "bg-accent hover:bg-accent/90 text-accent-foreground font-bold" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {step === "email"
                    ? "Continue"
                    : step === "login"
                      ? "Log in"
                      : "Create Account"}
                </Button>
              </form>

              {/* Footer text / Legal */}
              <div className="text-center text-sm text-muted-foreground mt-6">
                By continuing, you agree to Fresh&apos;s{" "}
                <Link href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline hover:text-foreground"
                >
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Force path toggle for testing/utility if needed, often hidden in prod */}
              <div className="text-center mt-4">
                <Link
                  href={
                    isProfessionalPath
                      ? `/login?type=customer${redirectPath ? `&redirect=${redirectPath}` : ""}`
                      : `/login?type=professional${redirectPath ? `&redirect=${redirectPath}` : ""}`
                  }
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {isProfessionalPath
                    ? "Not a business? Log in as a customer."
                    : "Are you a business? Log in to your salon tools."}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8 min-h-[500px] items-center text-muted-foreground flex-col">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <UnifiedAuthForm />
      </div>
    </Suspense>
  );
}
