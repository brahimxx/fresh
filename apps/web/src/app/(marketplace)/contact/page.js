'use client';

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        We&apos;d love to hear from you. Reach out to us through any of the channels below.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">General Inquiries</h2>
          <p className="text-muted-foreground">
            <a href="mailto:hello@freshapp.com" className="text-primary hover:underline">hello@freshapp.com</a>
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Business Partnerships</h2>
          <p className="text-muted-foreground">
            <a href="mailto:partners@freshapp.com" className="text-primary hover:underline">partners@freshapp.com</a>
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Support</h2>
          <p className="text-muted-foreground">
            <a href="mailto:support@freshapp.com" className="text-primary hover:underline">support@freshapp.com</a>
          </p>
        </div>
        <div className="border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Press</h2>
          <p className="text-muted-foreground">
            <a href="mailto:press@freshapp.com" className="text-primary hover:underline">press@freshapp.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
