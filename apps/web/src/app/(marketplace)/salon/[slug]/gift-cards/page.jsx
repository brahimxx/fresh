'use client';

/**
 * Public gift card purchase page for a salon.
 *
 * Customers can browse available gift card denominations and submit a
 * purchase request. For now, this creates an "active" gift card immediately
 * (cash-on-arrival model — the customer pays when they visit or the salon
 * sends a payment link separately). A full Stripe checkout integration can
 * be added later to enable online payment before card issuance.
 *
 * Route: /salon/[slug]/gift-cards
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Gift, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { decodeId } from '@/lib/id';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

var VALUE_PRESETS = [25, 50, 75, 100, 150, 200];

export default function PublicGiftCardsPage() {
  var params = useParams();
  var slug = params?.slug;
  // Extract salon ID from the SEO slug (e.g. "best-hair-salon-paris-163" → "163")
  var slugId = slug ? slug.split('-').pop() : null;
  var salonId = slugId ? decodeId(slugId) : null;

  var [selectedValue, setSelectedValue] = useState(50);
  var [customValue, setCustomValue] = useState('');
  var [recipientName, setRecipientName] = useState('');
  var [recipientEmail, setRecipientEmail] = useState('');
  var [senderName, setSenderName] = useState('');
  var [message, setMessage] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [success, setSuccess] = useState(false);
  var [error, setError] = useState(null);

  var finalValue = customValue ? Number(customValue) : selectedValue;

  async function handlePurchase(e) {
    e.preventDefault();
    if (!finalValue || finalValue < 1) return;
    if (!recipientEmail) {
      setError('Recipient email is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!salonId) {
        throw new Error('Salon not found');
      }

      // Create the gift card via the public-facing endpoint
      var res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_id: salonId,
          amount: finalValue,
          recipient_name: recipientName || null,
          recipient_email: recipientEmail,
          sender_name: senderName || null,
          message: message || null,
        }),
      });

      if (!res.ok) {
        var errData = await res.json();
        throw new Error(errData.message || 'Failed to purchase gift card');
      }

      var data = await res.json();
      // Redirect to Stripe Checkout
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Gift Card Sent!</h2>
            <p className="text-muted-foreground">
              A gift card for <strong>${finalValue.toFixed(2)}</strong> has been
              sent to <strong>{recipientEmail}</strong>. They&apos;ll receive it
              shortly with instructions on how to redeem.
            </p>
            <Link href={'/salon/' + slug}>
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Salon
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Gift Card</h1>
          <p className="text-muted-foreground text-lg">
            Give the gift of self-care. Choose an amount and we&apos;ll send it
            directly to your recipient.
          </p>
        </div>

        <form onSubmit={handlePurchase} className="space-y-6">
          {/* Amount Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {VALUE_PRESETS.map(function (value) {
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={selectedValue === value && !customValue ? 'default' : 'outline'}
                      className="h-12 text-lg font-semibold"
                      onClick={function () {
                        setSelectedValue(value);
                        setCustomValue('');
                      }}
                    >
                      ${value}
                    </Button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label>Or enter a custom amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Custom amount"
                    value={customValue}
                    onChange={function (e) { setCustomValue(e.target.value); }}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient Email *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  required
                  placeholder="recipient@email.com"
                  value={recipientEmail}
                  onChange={function (e) { setRecipientEmail(e.target.value); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient-name">Recipient Name</Label>
                <Input
                  id="recipient-name"
                  placeholder="Their name (optional)"
                  value={recipientName}
                  onChange={function (e) { setRecipientName(e.target.value); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">Your Name</Label>
                <Input
                  id="sender-name"
                  placeholder="Your name (optional)"
                  value={senderName}
                  onChange={function (e) { setSenderName(e.target.value); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message (optional)"
                  value={message}
                  onChange={function (e) { setMessage(e.target.value); }}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold"
            disabled={submitting || !finalValue || finalValue < 1}
          >
            {submitting ? 'Processing...' : `Purchase $${finalValue || 0} Gift Card`}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            The gift card will be emailed to the recipient immediately.
            Redeemable at checkout for any service or product.
          </p>
        </form>
      </div>
    </div>
  );
}
