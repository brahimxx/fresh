"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative bg-background">
      {/* Subtle radial gradient behind the card */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, oklch(0.65 0.19 15 / 6%) 0%, transparent 70%)",
        }}
      />

      {/* Top Navigation Bar */}
      <div className="absolute top-4 left-4 z-10">
        <Link 
          href="/" 
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full relative z-10 flex flex-col items-center mt-8">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <span className="font-semibold text-2xl tracking-tight text-foreground">Fresh</span>
          </div>
        </Link>
        {children}
      </div>
    </div>
  );
}

