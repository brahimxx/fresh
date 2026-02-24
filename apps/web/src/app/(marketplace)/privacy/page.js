'use client';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 2026</p>
      
      <div className="space-y-8 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email, phone number, and booking preferences when you create an account or make a booking.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our services, process bookings, send confirmations and reminders, and communicate with you about your account.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Information Sharing</h2>
          <p>We share your booking information with the salon or service provider you book with. We do not sell your personal information to third parties.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information, including encryption and secure authentication.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Contact Us</h2>
          <p>If you have questions about this privacy policy, please contact us at <a href="mailto:privacy@freshapp.com" className="text-primary hover:underline">privacy@freshapp.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
