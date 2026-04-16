"use client";

import Link from "next/link";
import { PlusCircle, Search, ArrowRight, Store, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfessionalChoosePath() {
  return (
    <div className="flex flex-col items-center min-h-[80vh] px-4 py-8">
      {/* Top Header / Back Button */}
      <div className="w-full max-w-4xl mb-8">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground">
            Welcome to Fresh
          </h1>
          <p className="text-xl text-muted-foreground max-w-[600px]">
            Let&apos;s get you set up. How would you like to continue?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Create Path */}
          <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <PlusCircle size={120} />
            </div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <PlusCircle className="text-accent w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Create a new business account
              </CardTitle>
              <CardDescription className="text-base min-h-[3rem]">
                Set up your own salon, spa, or clinic. Manage your services,
                staff, and clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                className="w-full h-12 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 group-hover:gap-3 transition-all"
              >
                <Link href="/onboarding">
                  Create New Business
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Join Path */}
          <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Search size={120} />
            </div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Search className="text-primary w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Join an existing business on Fresh
              </CardTitle>
              <CardDescription className="text-base min-h-[3rem]">
                Find your workplace and request to join their team as a staff
                member or manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                asChild
                className="w-full h-12 text-lg font-semibold group-hover:gap-3 transition-all"
              >
                <Link href="/onboarding/join">
                  Find Workplace
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
