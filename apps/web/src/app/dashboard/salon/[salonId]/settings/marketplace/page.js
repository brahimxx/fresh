'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Store, Globe, Eye, EyeOff, MapPin, Star, Clock, Image as ImageIcon, Info, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      setIsListed(salon.isMarketplaceEnabled || false);
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
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-muted/40 rounded-3xl" />
          <div className="lg:col-span-4 h-96 bg-muted/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };
  
  return (
    <div className="">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 mb-8 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <Globe className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discoverability Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Marketplace Tuning</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Control your salon's public visibility. Optimize your profile completeness to rank higher and attract new clients.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left Column: Form & Controls */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Main Visibility Toggle */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Marketplace Listing</h2>
                  <p className="text-sm text-muted-foreground">Global search visibility</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AnimatePresence mode="popLayout">
                  {isListed ? (
                    <motion.div
                      key="listed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> PUBLIC
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unlisted"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> HIDDEN
                    </motion.div>
                  )}
                </AnimatePresence>
                <Switch
                  checked={isListed}
                  onCheckedChange={handleToggleListing}
                  disabled={toggleMarketplace.isPending}
                  className="data-[state=checked]:bg-primary scale-125 ml-2"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isListed ? (
                <motion.div 
                  key="listed-alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start"
                >
                  <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Your salon is live.</h4>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      You are currently appearing in marketplace search results. New clients can discover and book you directly. Keep your profile updated!
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="hidden-alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 rounded-2xl bg-muted/30 border border-border/50 flex gap-4 items-start"
                >
                  <EyeOff className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">You are currently hidden.</h4>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      Your salon is unlisted from the public marketplace. Only clients with your direct booking link can see your service menu.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Profile Editor */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 pb-6 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Public Profile</h2>
                <p className="text-sm text-muted-foreground">Information shown to potential clients</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Catchy Tagline</Label>
                <Input
                  value={profile.tagline}
                  onChange={function(e) { 
                    setProfile(function(p) { return { ...p, tagline: e.target.value }; }); 
                  }}
                  placeholder="Your go-to salon for stunning transformations"
                  maxLength={100}
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>A short description appearing right under your title.</span>
                  <span className={profile.tagline.length > 90 ? "text-destructive" : ""}>{profile.tagline.length}/100</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Business Highlights</Label>
                <Textarea
                  value={profile.highlights}
                  onChange={function(e) { 
                    setProfile(function(p) { return { ...p, highlights: e.target.value }; }); 
                  }}
                  placeholder="• Award-winning stylists&#10;• Eco-friendly products&#10;• Free parking"
                  rows={4}
                  className="min-h-[120px] rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 resize-y"
                />
                <p className="text-xs text-muted-foreground">Key selling points (one per line) visible on your detailed page.</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Specialties (Tags)</Label>
                <Input
                  value={profile.specialties}
                  onChange={function(e) { 
                    setProfile(function(p) { return { ...p, specialties: e.target.value }; }); 
                  }}
                  placeholder="Balayage, Keratin treatments, Bridal styling"
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground">Comma-separated list. We use these for SEO and marketplace search tags.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Years in Business</Label>
                  <Input
                    type="number"
                    value={profile.years_in_business}
                    onChange={function(e) { 
                      setProfile(function(p) { return { ...p, years_in_business: e.target.value }; }); 
                    }}
                    placeholder="10"
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Languages Spoken</Label>
                  <Input
                    value={profile.languages}
                    onChange={function(e) { 
                      setProfile(function(p) { return { ...p, languages: e.target.value }; }); 
                    }}
                    placeholder="English, Spanish"
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-8">
               <Button 
                onClick={handleSaveProfile} 
                disabled={updateSalon.isPending}
                 size="lg"
                 className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
               >
                 {updateSalon.isPending ? 'Syncing...' : 'Save Profile Map'}
               </Button>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Preview & Stats */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Completeness Score */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
             <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Search Engine Score</h2>
              <p className="text-sm text-muted-foreground">Complete profiles rank higher</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-extrabold tracking-tighter text-primary">{completeness}%</span>
                <span className="text-sm font-bold text-muted-foreground mb-1">Optimized</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
              
              {completeness < 100 && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-500">Missing Elements:</span>
                  </div>
                  <ul className="space-y-2 text-sm text-amber-600/80 dark:text-amber-400/80 font-medium">
                    {!profile.tagline && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Catchy tagline</li>}
                    {!profile.specialties && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Searchable specialties</li>}
                    {!salon?.description && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> General business description</li>}
                  </ul>
                </div>
              )}
              {completeness === 100 && (
                 <div className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex gap-3 items-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 leading-tight">Your profile is fully optimized for maximum search visibility!</p>
                 </div>
              )}
            </div>
          </motion.div>

          {/* Simulator Preview */}
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="mb-6 relative z-10">
              <h2 className="text-xl font-bold tracking-tight">Listing Simulation</h2>
              <p className="text-sm text-muted-foreground">Client discovery view</p>
            </div>
            
            <div className="bg-background border border-border/50 rounded-2xl p-5 shadow-lg shadow-black/5 relative z-10 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted/50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-border/50 shadow-inner overflow-hidden">
                  {salon?.photos?.[0] ? (
                    <img src={salon.photos[0].url} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-1" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{salon?.name || 'Your Salon Name'}</h3>
                      <p className="text-xs font-medium text-muted-foreground truncate max-w-full">
                        {profile.tagline || 'Your catchy tagline will appear here...'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                       <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 flex items-center gap-1 font-bold">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {salon?.rating || 'New'}
                       </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                      <MapPin className="h-3 w-3" />
                      {salon?.city || 'City, State'}
                    </span>
                    <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md text-emerald-600 dark:text-emerald-400">
                      <Clock className="h-3 w-3" />
                      Open today
                    </span>
                  </div>
                  
                  {profile.specialties && (
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      {profile.specialties.split(',').slice(0, 3).map(function(specialty, i) {
                        return (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 font-bold border-border bg-background">
                            {specialty.trim()}
                          </Badge>
                        );
                      })}
                      {profile.specialties.split(',').length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-bold self-center">+{profile.specialties.split(',').length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </motion.div>
    </div>
  );
}
