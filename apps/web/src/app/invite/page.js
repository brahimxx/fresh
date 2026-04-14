import { redirect } from "next/navigation";
import { getOne, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, User, CheckCircle2, AlertCircle } from "lucide-react";
import AcceptInviteForm from "./accept-form"; // Client component

export default async function InvitePage({ searchParams }) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/");
  }

  // Look up invitation
  const invite = await getOne(
    `
    SELECT i.*, s.name as salon_name 
    FROM staff_invitations i 
    JOIN salons s ON i.salon_id = s.id 
    WHERE i.token = ? AND s.deleted_at IS NULL
  `,
    [token],
  );

  if (!invite) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-background max-w-md w-full p-8 rounded-2xl border shadow-sm text-center">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation Unavailable</h1>
          <p className="text-muted-foreground mb-6">
            This invitation link is invalid, has expired, or the business was permanently closed.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check expiration
  if (new Date(invite.expires_at) < new Date() || invite.status === "expired") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-background max-w-md w-full p-8 rounded-2xl border shadow-sm text-center">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation Expired</h1>
          <p className="text-muted-foreground mb-6">
            This invitation link has expired. Please ask the salon owner to send
            you a new invitation.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-background max-w-md w-full p-8 rounded-2xl border shadow-sm text-center">
          <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Already Accepted</h1>
          <p className="text-muted-foreground mb-6">
            You&apos;ve already accepted this invitation. You can log in to view
            your dashboard.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const session = await getSession();

  // If user is logged in but doesn't match email, or not logged in, prompt appropriately
  const isLoggedIn = !!session;
    // Check if the invited email already has an account registered
    const existingUser = await getOne("SELECT id FROM users WHERE email = ?", [invite.email]);
    const accountExists = !!existingUser;
  if (isLoggedIn && session.email !== invite.email) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-background max-w-md w-full p-8 rounded-2xl border shadow-sm text-center">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account Mismatch</h1>
          <p className="text-muted-foreground mb-6">
            You are logged in as <strong>{session.email}</strong>, but this
            invitation is for <strong>{invite.email}</strong>.
            <br />
            <br />
            Please log out and either create a new account or log in with the
            correct email address to accept this invitation.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link
              href={`/auth/login?logout=true&redirect=/invite?token=${token}`}
            >
              Sign Out & Switch Account
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="bg-background max-w-md w-full p-8 rounded-2xl border shadow-sm">
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Join {invite.salon_name}</h1>
          <p className="text-muted-foreground">
            You have been invited to join their team on Fresh as a staff member.
          </p>
        </div>

        <AcceptInviteForm
          token={token}
          inviteEmail={invite.email}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}
