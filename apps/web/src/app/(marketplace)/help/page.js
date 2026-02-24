'use client';

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Help Center</h1>
      <p className="text-muted-foreground mb-8">
        Find answers to common questions and get the support you need.
      </p>
      <div className="space-y-6">
        <div className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">How do I book an appointment?</h2>
          <p className="text-muted-foreground">
            Search for a salon or service, choose your preferred time slot, and confirm your booking. You&apos;ll receive a confirmation notification.
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">How do I cancel a booking?</h2>
          <p className="text-muted-foreground">
            Go to your bookings page, select the booking you want to cancel, and click the cancel button. Please note that late cancellations may be flagged.
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">How do I list my business?</h2>
          <p className="text-muted-foreground">
            Click &quot;For Business&quot; in the navigation, create a professional account, and follow the onboarding steps to set up your salon profile.
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">Need more help?</h2>
          <p className="text-muted-foreground">
            Contact our support team at <a href="mailto:support@freshapp.com" className="text-primary hover:underline">support@freshapp.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
