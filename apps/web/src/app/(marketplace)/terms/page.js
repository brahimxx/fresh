'use client';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 2026</p>
      
      <div className="space-y-8 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using Fresh, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of Service</h2>
          <p>Fresh provides a platform for booking beauty and wellness services. You are responsible for maintaining the confidentiality of your account and password.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Bookings and Cancellations</h2>
          <p>Bookings are subject to availability. Cancellation policies are set by individual service providers. Late cancellations may be subject to fees as determined by the salon.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Payment</h2>
          <p>Payments are processed securely through our platform. Service providers set their own prices and payment terms.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitation of Liability</h2>
          <p>Fresh acts as a platform connecting clients with service providers. We are not responsible for the quality of services rendered by individual salons or practitioners.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:legal@freshapp.com" className="text-primary hover:underline">legal@freshapp.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
