'use client';

/**
 * Public gift card balance checker.
 * Route: /salon/[slug]/gift-cards/check
 *
 * Clients enter their gift card code and see the remaining balance,
 * expiry date, and whether the card is still active.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Gift, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function GiftCardBalanceCheckPage() {
  var params = useParams();
  var slug = params?.slug;

  var [code, setCode] = useState('');
  var [checking, setChecking] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);

  async function handleCheck(e) {
    e.preventDefault();
    if (!code.trim()) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      var res = await fetch('/api/gift-cards/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      if (!res.ok) {
        var errData = await res.json();
        throw new Error(errData.message || 'Gift card not found');
      }

      var json = await res.json();
      setResult(json.data || json);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Check Balance</h1>
          <p className="text-muted-foreground">
            Enter your gift card code to check the remaining balance.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={function (e) { setCode(e.target.value.toUpperCase()); }}
              className="font-mono text-center text-lg tracking-wider"
              maxLength={19}
            />
            <Button type="submit" disabled={checking || !code.trim()}>
              {checking ? '...' : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center space-y-2">
              <XCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-700 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className={result.isActive ? 'border-emerald-200' : 'border-yellow-200'}>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                {result.isActive ? (
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                ) : result.isExpired ? (
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto" />
                ) : (
                  <XCircle className="h-10 w-10 text-gray-400 mx-auto" />
                )}

                <Badge
                  variant="outline"
                  className={
                    result.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                      : result.isExpired
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200'
                        : 'bg-gray-500/10 text-gray-600 border-gray-200'
                  }
                >
                  {result.isActive ? 'Active' : result.isExpired ? 'Expired' : 'Depleted'}
                </Badge>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
                <p className="text-4xl font-bold mt-1">
                  ${Number(result.remainingBalance || 0).toFixed(2)}
                </p>
                {result.initialBalance && result.remainingBalance < result.initialBalance && (
                  <p className="text-sm text-muted-foreground mt-1">
                    of ${Number(result.initialBalance).toFixed(2)} original value
                  </p>
                )}
              </div>

              {result.expiresAt && (
                <div className="text-center text-sm text-muted-foreground">
                  {result.isExpired ? 'Expired on ' : 'Expires '}
                  {new Date(result.expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              )}

              {result.isActive && (
                <p className="text-center text-xs text-muted-foreground pt-2 border-t">
                  Present this code at checkout to redeem your balance.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Links */}
        <div className="text-center space-y-2">
          <Link
            href={'/salon/' + slug + '/gift-cards'}
            className="text-sm text-primary hover:underline"
          >
            Purchase a gift card
          </Link>
          <span className="text-muted-foreground mx-2">·</span>
          <Link
            href={'/salon/' + slug}
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to salon
          </Link>
        </div>
      </div>
    </div>
  );
}
