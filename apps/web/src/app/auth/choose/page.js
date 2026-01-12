"use client";

import Link from "next/link";
import { User, Store, ArrowRight, Sparkles } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ChooseAuthPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Welcome to Fresh
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          The world&apos;s best platform for beauty and wellness. How would you like to use Fresh today?
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Customer Path */}
        <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <User size={120} />
          </div>
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <User className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Fresh for customers</CardTitle>
            <CardDescription className="text-base min-h-[3rem]">
              Book salons and spas near you. Discover, book and pay for beauty and wellness services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full h-12 text-lg font-semibold group-hover:gap-3 transition-all">
              <Link href="/login?type=customer">
                Continue as Customer
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <p className="text-sm text-center mt-4 text-muted-foreground">
              New to Fresh? <Link href="/register?type=customer" className="text-primary font-medium hover:underline">Sign up for free</Link>
            </p>
          </CardContent>
        </Card>

        {/* Professional Path */}
        <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Store size={120} />
          </div>
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Store className="text-accent w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">Fresh for professionals</CardTitle>
              <div className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Partner
              </div>
            </div>
            <CardDescription className="text-base min-h-[3rem]">
              Manage and grow your business. Set up your salon, manage staff, and reach new clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild className="w-full h-12 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 group-hover:gap-3 transition-all">
              <Link href="/login?type=professional">
                Continue as Professional
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <p className="text-sm text-center mt-4 text-muted-foreground">
              Own a business? <Link href="/register?type=professional" className="text-accent font-medium hover:underline">Register your business</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 flex items-center gap-6 text-sm text-muted-foreground opacity-60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Award winning platform</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Used by millions daily</span>
        </div>
      </div>
    </div>
  );
}
