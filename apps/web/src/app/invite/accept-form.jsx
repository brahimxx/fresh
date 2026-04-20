"use client";

import { useState } from "react";
import { encodeId } from "@/lib/id";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api-client";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";

export default function AcceptInviteForm({
  token,
  inviteEmail,
  isLoggedIn,
  accountExists,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { checkAuth } = useAuth();

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const res = await api.post("/invitations/accept", { token });
      toast.success("Invitation accepted successfully!");
      if (checkAuth) await checkAuth();
      if (res.salonId) {
        router.push(`/dashboard/salon/${encodeId(res.salonId)}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    if (accountExists) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-medium text-center text-muted-foreground mb-4">
            To accept this invitation, please log in with your email: <br />
            <strong className="text-foreground">{inviteEmail}</strong>
          </p>

          <Button asChild className="w-full">
            <Link
              href={`/auth/login?email=${encodeURIComponent(inviteEmail)}&redirect=/invite?token=${token}`}
            >
              Log In to Accept
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-center text-muted-foreground mb-4">
          To accept this invitation, you need to create a profile using your
          email: <br />
          <strong className="text-foreground">{inviteEmail}</strong>
        </p>

        <Button asChild className="w-full">
          <Link
            href={`/auth/register?email=${encodeURIComponent(inviteEmail)}`}
          >
            Create Account to Accept
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Button className="w-full" onClick={handleAccept} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Accept Invitation
    </Button>
  );
}
