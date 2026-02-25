"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";
import { Suspense } from "react";

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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeState, setShowUpgradeState] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const redirectPath = searchParams.get("redirect");
  const authType = searchParams.get("type") || "customer"; // 'customer' or 'professional'
  const isProfessionalPath = authType === "professional";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await fetch('/api/auth/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upgrade account');
      }

      toast.success("Account upgraded to Professional! 🚀");
      router.push("/onboarding");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await login(data.email, data.password);
      const user = response?.user || response;
      const userRole = user?.role;

      if (isProfessionalPath && userRole === 'client') {
        setLoggedInUser(user);
        setShowUpgradeState(true);
        return;
      }

      toast.success("Welcome back!");

      if (redirectPath) {
        router.push(redirectPath);
      } else if (userRole === 'owner') {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (error) {
      toast.error(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  if (showUpgradeState) {
    return (
      <Card className="border-accent">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 mx-auto">
            <Store className="text-accent w-6 h-6" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-accent">Upgrade to Professional</CardTitle>
          <CardDescription className="text-center text-base">
            Hi {loggedInUser?.firstName || 'there'}! You&apos;re logging into the professional platform.
            Would you like to upgrade your account to manage your own salon?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 text-sm text-muted-foreground text-center">
          <p>This will allow you to:</p>
          <ul className="grid grid-cols-1 gap-2 text-left max-w-[240px] mx-auto">
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Create your salon profile</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Manage services and staff</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Grow your business with Fresh</li>
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
          <Button variant="ghost" onClick={() => router.push("/")} disabled={isUpgrading}>
            Keep as customer only
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={isProfessionalPath ? "border-accent shadow-accent/5 shadow-2xl" : "shadow-xl border-border/50"}>
      <CardHeader className="space-y-1">
        {isProfessionalPath && (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2 mx-auto">
            <Store className="text-accent w-5 h-5" />
          </div>
        )}
        <CardTitle className={`text-2xl text-center font-bold ${isProfessionalPath ? "text-accent" : ""}`}>
          {isProfessionalPath ? "Professional Login" : "Sign in"}
        </CardTitle>
        <CardDescription className="text-center">
          {isProfessionalPath
            ? "Manage your salon and grow your business"
            : "Enter your email and password to access your account"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isLoading}
              {...register("email")}
              className={isProfessionalPath ? "focus-visible:ring-accent" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
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
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              className={isProfessionalPath ? "focus-visible:ring-accent" : ""}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-6">
          <Button
            type="submit"
            className={`w-full h-11 font-medium ${isProfessionalPath ? "bg-accent hover:bg-accent/90 text-accent-foreground font-bold" : ""}`}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={isProfessionalPath ? "/register?type=professional" : "/register?type=customer"}
              className={`font-semibold hover:underline ${isProfessionalPath ? "text-accent" : "text-primary"}`}
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
