"use client";

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

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <span className="font-semibold text-2xl tracking-tight">Fresh</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

