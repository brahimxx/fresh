'use client';

import { XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function GiftCardCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold">Payment Cancelled</h2>
          <p className="text-muted-foreground">
            Your gift card purchase was not completed. No payment has been charged.
          </p>
          <p className="text-sm text-muted-foreground">
            You can try again anytime. The gift card will only be issued after successful payment.
          </p>

          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
