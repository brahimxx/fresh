"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

function VerificationHandler() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { checkAuth } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided. Check the link in your email.");
      return;
    }

    let isMounted = true;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        
        if (data.success) {
          setStatus("success");
          setMessage(data.data?.message || "Your email has been successfully verified.");
          // IMPORTANT: Update user state so the banner disappears globally!
          checkAuth().catch(() => {});
        } else {
          setStatus("error");
          setMessage(data.error || "This verification link is invalid or expired.");
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setStatus("error");
          setMessage("An unexpected error occurred while verifying your email.");
        }
      });
      
    return () => { isMounted = false; };
  }, [token, checkAuth]);

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-card rounded-3xl shadow-2xl shadow-accent/5 max-w-sm w-full mx-auto border border-border/50 ring-1 ring-border/5 relative z-10 scale-100 animate-in zoom-in-95 duration-500">
      {status === "loading" && (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Verifying Email</h2>
          <p className="text-muted-foreground text-center text-[15px] leading-relaxed">
            Please wait while we confirm your email address securely...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center animate-in fade-in duration-500 w-full text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 ring-8 ring-accent/5">
            <CheckCircle2 className="h-8 w-8 text-accent shrink-0" strokeWidth={2.5}/>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-foreground">Verified!</h2>
          <p className="text-muted-foreground text-[15px] mb-6 leading-relaxed max-w-[280px] mx-auto">
            {message}
          </p>
          <Link href="/dashboard" className="w-full mt-4 block">
            <Button className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-lg font-bold">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500 w-full px-2 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-8 ring-red-500/5">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-foreground">Verification Failed</h2>
          <p className="text-muted-foreground text-[15px] mb-8 leading-relaxed max-w-[280px]">
            {message}
          </p>
          <Link href="/login" className="w-full mt-2 block">
            <Button variant="outline" className="w-full h-11 border-2 font-semibold">Return to Login</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[85vh] flex items-start justify-center pt-24 pb-12 px-4 relative overflow-hidden bg-background">
      {/* Dynamic background effect similar to auth pages */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-background to-background pointer-events-none" />
      
      <Suspense fallback={<Loader2 className="w-10 h-10 animate-spin my-32 text-accent" />}>
        <VerificationHandler />
      </Suspense>
    </div>
  );
}