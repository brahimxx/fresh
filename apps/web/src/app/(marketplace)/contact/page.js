'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    toast.success('Message sent! We will get back to you soon.');
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          We&apos;d love to hear from you. Reach out with any questions, partnership inquiries, or support requests.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-12">
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-xl p-6 bg-card shadow-sm">
            <h2 className="text-lg font-bold mb-2">General Inquiries</h2>
            <p className="text-muted-foreground">
              <a href="mailto:hello@freshapp.com" className="text-primary hover:underline font-medium">hello@freshapp.com</a>
            </p>
          </div>
          <div className="border rounded-xl p-6 bg-card shadow-sm">
            <h2 className="text-lg font-bold mb-2">Business Partnerships</h2>
            <p className="text-muted-foreground">
              <a href="mailto:partners@freshapp.com" className="text-primary hover:underline font-medium">partners@freshapp.com</a>
            </p>
          </div>
          <div className="border rounded-xl p-6 bg-card shadow-sm">
            <h2 className="text-lg font-bold mb-2">Support & Help</h2>
            <p className="text-muted-foreground">
              <a href="mailto:support@freshapp.com" className="text-primary hover:underline font-medium">support@freshapp.com</a>
            </p>
          </div>
        </div>

        <div className="md:col-span-3">
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Send us a Message</CardTitle>
              <CardDescription>Fill out the form below and our team will respond within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" disabled={isSubmitting} {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" disabled={isSubmitting} {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help you?" disabled={isSubmitting} {...register('subject')} />
                  {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Please provide as much detail as possible..." className="min-h-32" disabled={isSubmitting} {...register('message')} />
                  {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                </div>
                <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
