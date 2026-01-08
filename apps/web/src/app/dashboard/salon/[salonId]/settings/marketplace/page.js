'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Store, Globe, Eye, EyeOff, MapPin, Star, Clock, Image } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import {
  useSalonSettings,
  useToggleMarketplace,
  useUpdateSalonSettings,
} from '@/hooks/use-settings';

export default function MarketplacePage() {
  var params = useParams();
  var { toast } = useToast();
  
  var { data: salon, isLoading } = useSalonSettings(params.salonId);
  var toggleMarketplace = useToggleMarketplace();
  var updateSalon = useUpdateSalonSettings();
  
  var [isListed, setIsListed] = useState(false);
  var [profile, setProfile] = useState({
    tagline: '',
    highlights: '',
    specialties: '',
    years_in_business: '',
    languages: '',
  });
  
  useEffect(function() {
    if (salon) {
      setIsListed(salon.marketplace_listed || false);
      setProfile({
        tagline: salon.tagline || '',
        highlights: salon.highlights || '',
        specialties: salon.specialties || '',
        years_in_business: salon.years_in_business || '',
        languages: salon.languages || '',
      });
    }
  }, [salon]);
  
  function handleToggleListing() {
    var newValue = !isListed;
    setIsListed(newValue);
    
    toggleMarketplace.mutate({
      salonId: params.salonId,
      enabled: newValue,
    }, {
      onSuccess: function() {
        toast({ 
          title: newValue ? 'Listed on marketplace' : 'Removed from marketplace',
          description: newValue 
            ? 'Your salon is now visible to new clients'
            : 'Your salon is now hidden from search'
        });
      },
      onError: function(error) {
        setIsListed(!newValue);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  function handleSaveProfile() {
    updateSalon.mutate({
      salonId: params.salonId,
      data: profile,
    }, {
      onSuccess: function() {
        toast({ title: 'Marketplace profile saved' });
      },
      onError: function(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  }
  
  // Calculate profile completeness
  function getProfileCompleteness() {
    var fields = [
      salon?.name,
      salon?.description,
      salon?.phone,
      salon?.email,
      salon?.address,
      profile.tagline,
      profile.specialties,
    ];
    var filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }
  
  var completeness = getProfileCompleteness();
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace Settings</h1>
        <p className="text-muted-foreground">
          Control your visibility and profile on the public marketplace
        </p>
      </div>
      
      {/* Listing Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Marketplace Listing
              </CardTitle>
              <CardDescription>
                Allow new clients to discover your salon
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isListed ? 'default' : 'secondary'}>
                {isListed ? (
                  <><Eye className="h-3 w-3 mr-1" /> Visible</>
                ) : (
                  <><EyeOff className="h-3 w-3 mr-1" /> Hidden</>
                )}
              </Badge>
              <Switch
                checked={isListed}
                onCheckedChange={handleToggleListing}
                disabled={toggleMarketplace.isPending}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isListed ? (
            <Alert>
              <Store className="h-4 w-4" />
              <AlertDescription>
                Your salon appears in search results and can be booked by anyone. 
                Complete your profile below to attract more clients.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="secondary">
              <EyeOff className="h-4 w-4" />
              <AlertDescription>
                Your salon is hidden from public search. Only clients with your 
                direct link can book appointments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Completeness</CardTitle>
          <CardDescription>
            Complete profiles appear higher in search results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Profile strength</span>
              <span className="font-medium">{completeness}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: completeness + '%' }}
              />
            </div>
            
            {completeness < 100 && (
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p>To improve your profile:</p>
                <ul className="list-disc list-inside">
                  {!profile.tagline && <li>Add a catchy tagline</li>}
                  {!profile.specialties && <li>List your specialties</li>}
                  {!salon?.description && <li>Write a business description</li>}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Public Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Public Profile
          </CardTitle>
          <CardDescription>
            Information shown to potential clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={profile.tagline}
              onChange={function(e) { 
                setProfile(function(p) { return { ...p, tagline: e.target.value }; }); 
              }}
              placeholder="Your go-to salon for stunning transformations"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              A short, catchy description (max 100 characters)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Business Highlights</Label>
            <Textarea
              value={profile.highlights}
              onChange={function(e) { 
                setProfile(function(p) { return { ...p, highlights: e.target.value }; }); 
              }}
              placeholder="• Award-winning stylists&#10;• Eco-friendly products&#10;• Free parking"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Key selling points (one per line)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Specialties</Label>
            <Input
              value={profile.specialties}
              onChange={function(e) { 
                setProfile(function(p) { return { ...p, specialties: e.target.value }; }); 
              }}
              placeholder="Balayage, Keratin treatments, Bridal styling"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of your specialties
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Years in Business</Label>
              <Input
                type="number"
                value={profile.years_in_business}
                onChange={function(e) { 
                  setProfile(function(p) { return { ...p, years_in_business: e.target.value }; }); 
                }}
                placeholder="10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Languages Spoken</Label>
              <Input
                value={profile.languages}
                onChange={function(e) { 
                  setProfile(function(p) { return { ...p, languages: e.target.value }; }); 
                }}
                placeholder="English, Spanish"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Marketplace Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Listing Preview</CardTitle>
          <CardDescription>
            How your salon appears in search results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{salon?.name || 'Salon Name'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {profile.tagline || 'Add a tagline to attract clients'}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {salon?.rating || '4.8'}
                  </Badge>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {salon?.city || 'City, State'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Open today
                  </span>
                </div>
                
                {profile.specialties && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {profile.specialties.split(',').slice(0, 3).map(function(specialty, i) {
                      return (
                        <Badge key={i} variant="outline" className="text-xs">
                          {specialty.trim()}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={updateSalon.isPending}>
          {updateSalon.isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
