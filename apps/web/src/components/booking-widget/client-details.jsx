'use client';

import { User, Mail, Phone, MessageSquare } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export function ClientDetails({ details, onChange, errors }) {
  function updateField(field, value) {
    onChange({ ...details, [field]: value });
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide your contact information
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="John"
                value={details.firstName || ''}
                onChange={function(e) { updateField('firstName', e.target.value); }}
                className={'pl-10 ' + (errors?.firstName ? 'border-red-500' : '')}
              />
            </div>
            {errors?.firstName && (
              <p className="text-xs text-red-500">{errors.firstName}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={details.lastName || ''}
              onChange={function(e) { updateField('lastName', e.target.value); }}
              className={errors?.lastName ? 'border-red-500' : ''}
            />
            {errors?.lastName && (
              <p className="text-xs text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>
        
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={details.email || ''}
              onChange={function(e) { updateField('email', e.target.value); }}
              className={'pl-10 ' + (errors?.email ? 'border-red-500' : '')}
            />
          </div>
          {errors?.email && (
            <p className="text-xs text-red-500">{errors.email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll send your booking confirmation here
          </p>
        </div>
        
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={details.phone || ''}
              onChange={function(e) { updateField('phone', e.target.value); }}
              className={'pl-10 ' + (errors?.phone ? 'border-red-500' : '')}
            />
          </div>
          {errors?.phone && (
            <p className="text-xs text-red-500">{errors.phone}</p>
          )}
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="notes"
              placeholder="Any special requests or information we should know?"
              value={details.notes || ''}
              onChange={function(e) { updateField('notes', e.target.value); }}
              className="pl-10 min-h-[100px]"
            />
          </div>
        </div>
        
        {/* Marketing Consent */}
        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="marketing"
            checked={details.marketingConsent || false}
            onCheckedChange={function(checked) { updateField('marketingConsent', checked); }}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="marketing"
              className="text-sm font-normal cursor-pointer"
            >
              Send me special offers and updates
            </Label>
            <p className="text-xs text-muted-foreground">
              You can unsubscribe at any time
            </p>
          </div>
        </div>
        
        {/* Terms */}
        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="terms"
            checked={details.termsAccepted || false}
            onCheckedChange={function(checked) { updateField('termsAccepted', checked); }}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className={'text-sm font-normal cursor-pointer ' + (errors?.termsAccepted ? 'text-red-500' : '')}
            >
              I agree to the Terms of Service and Privacy Policy *
            </Label>
            {errors?.termsAccepted && (
              <p className="text-xs text-red-500">{errors.termsAccepted}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
