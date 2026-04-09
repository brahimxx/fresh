"use client";

import { useAuth } from "@/providers/auth-provider";
import { AlertCircle, Mail, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const { user, isAuthenticated } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check LocalStorage to persist cooldown across reloads
  useEffect(() => {
    if (!user) return;
    const cooldownEnd = localStorage.getItem(`verifyCooldown_${user.id}`);
    if (cooldownEnd) {
      const remainingSeconds = Math.ceil((parseInt(cooldownEnd) - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        setCountdown(remainingSeconds);
      }
    }
  }, [user]);

  // Tick down the countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // If not logged in, or if email is verified, don't show the banner.
  if (!isAuthenticated || !user || user.emailVerified) {
    return null;
  }

  // Handle re-sending verification email
  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      setIsSending(true);
      
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to resend email");
      }

      toast.success("Verification email sent", {
        description: "Please check your inbox.",
      });
      
      // Start 60 second cooldown
      setCountdown(60);
      localStorage.setItem(`verifyCooldown_${user.id}`, (Date.now() + 60000).toString());
      
    } catch (error) {
      toast.error("Failed to send", {
        description: error.message || "Please try again later.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between flex-wrap gap-3 text-sm text-yellow-600 dark:text-yellow-500">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Please verify your email address ({user.email}) to fully secure your account.
          </span>
        </div>
        <button
          onClick={handleResend}
          disabled={isSending || countdown > 0}
          className="flex items-center gap-1.5 rounded-md bg-yellow-500/20 px-3 py-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed min-w-[120px] justify-center"
        >
          {countdown > 0 ? (
            <>
              <Clock className="h-3.5 w-3.5" />
              Resend in {countdown}s
            </>
          ) : (
            <>
              <Mail className="h-3.5 w-3.5" />
              {isSending ? "Sending..." : "Resend Email"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}