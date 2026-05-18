'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

function GiftCardSuccessContent() {
  var searchParams = useSearchParams();
  var code = searchParams.get('code');
  var amount = searchParams.get('amount');

  return (
    <Card className="max-w-md w-full text-center">
      <CardContent className="pt-8 pb-8 space-y-4">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Payment Successful!</h2>
        <p className="text-muted-foreground">
          Your gift card has been purchased and sent to the recipient.
        </p>

        {code && (
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Gift Card Code</p>
            <p className="text-xl font-mono font-bold tracking-wider">{code}</p>
            {amount && (
              <p className="text-sm text-muted-foreground">
                Value: <strong>${Number(amount).toFixed(2)}</strong>
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          The recipient will receive an email with the gift card code and instructions on how to redeem it.
        </p>

        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function GiftCardSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      }>
        <GiftCardSuccessContent />
      </Suspense>
    </div>
  );
}
