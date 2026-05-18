'use client';

/**
 * Public gift card purchase page for a salon.
 *
 * Customers can browse available gift card denominations and submit a
 * purchase request. Creates a Stripe Checkout session for online payment.
 * The gift card is activated after successful payment (handled by webhook).
 *
 * Route: /salon/[slug]/gift-cards
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Gift, Check, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { decodeId } from '@/lib/id';
import { formatCurrency, CURRENCY_CONFIG, PLATFORM_CURRENCY } from '@/lib/format';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PublicGiftCardsPage() {
  var params = useParams();
  var slug = params?.slug;
  // Extract salon ID from the SEO slug (e.g. "best-hair-salon-paris-163" → "163")
  var slugId = slug ? slug.split('-').pop() : null;
  var salonId = slugId ? decodeId(slugId) : null;

  var [salon, setSalon] = useState(null);
  var [loading, setLoading] = useState(true);
  var [selectedValue, setSelectedValue] = useState(null);
  var [customValue, setCustomValue] = useState('');
  var [recipientName, setRecipientName] = useState('');
  var [recipientEmail, setRecipientEmail] = useState('');
  var [senderName, setSenderName] = useState('');
  var [message, setMessage] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [success, setSuccess] = useState(false);
  var [error, setError] = useState(null);

  // Fetch salon info to get currency
  useEffect(function () {
    if (!salonId) {
      setLoading(false);
      return;
    }
    fetch('/api/marketplace/salons/' + salonId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.data) {
          setSalon(data.data);
        }
      })
      .catch(function () { /* ignore */ })
      .finally(function () { setLoading(false); });
  }, [salonId]);

  var currency = salon?.currency || PLATFORM_CURRENCY;
  var config = CURRENCY_CONFIG[currency?.toUpperCase()] || CURRENCY_CONFIG.DZD;

  // Generate presets appropriate for the currency
  // DZD: larger amounts (500, 1000, 2000, 3000, 5000, 10000)
  // EUR/USD/GBP: smaller amounts (25, 50, 75, 100, 150, 200)
  var VALUE_PRESETS = config.practicalDecimals === 0
    ? [500, 1000, 2000, 3000, 5000, 10000]
    : [25, 50, 75, 100, 150, 200];

  // Set default selection once presets are determined
  useEffect(function () {
    if (!loading && selectedValue === null) {
      setSelectedValue(VALUE_PRESETS[1]);
    }
  }, [loading]);

  var finalValue = customValue ? Number(customValue) : (selectedValue || VALUE_PRESETS[1]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
              A gift card for <strong>{formatCurrency(finalValue, currency)}</strong> has been
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
          {salon?.name && (
            <p className="text-sm text-muted-foreground">
              For <strong>{salon.name}</strong>
            </p>
          )}
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
                      {formatCurrency(value, currency)}
                    </Button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label>Or enter a custom amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {config.symbol}
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step={config.practicalDecimals === 0 ? '1' : '0.01'}
                    placeholder="Custom amount"
                    value={customValue}
                    onChange={function (e) { setCustomValue(e.target.value); }}
                    className="pl-10"
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
            {submitting ? 'Processing...' : 'Purchase ' + formatCurrency(finalValue || 0, currency) + ' Gift Card'}
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
