'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  Share2,
  Heart,
  ChevronRight,
  Calendar,
  Users,
  Check
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SalonProfilePage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.id;

  var [salon, setSalon] = useState(null);
  var [services, setServices] = useState([]);
  var [staff, setStaff] = useState([]);
  var [reviews, setReviews] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeTab, setActiveTab] = useState('services');
  var [activeImageIndex, setActiveImageIndex] = useState(0);

  // --- Dynamic Data Calculations ---
  var galleryImages = (salon && salon.gallery && salon.gallery.length > 0) 
    ? salon.gallery.map(g => g.image_url) 
    : (salon && salon.cover_image_url ? [salon.cover_image_url] : []);

  // Calculate review distribution
  var starStats = [0, 0, 0, 0, 0, 0]; // 0-5
  reviews.forEach(function (r) {
    var rating = Math.round(r.rating || 0);
    if (rating >= 1 && rating <= 5) {
      starStats[rating]++;
    }
  });
  var totalReviews = reviews.length;
  var starPercentages = starStats.map(function (count) {
    return totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
  });

  // Calculate staff ratings from reviews
  var staffStats = {};
  reviews.forEach(function (r) {
    if (r.staff_id) {
      if (!staffStats[r.staff_id]) {
        staffStats[r.staff_id] = { totalRating: 0, count: 0 };
      }
      staffStats[r.staff_id].totalRating += r.rating;
      staffStats[r.staff_id].count++;
    }
  });

  var enrichedStaff = staff.map(function (s) {
    var stats = staffStats[s.id] || { totalRating: 0, count: 0 };
    return {
      ...s,
      rating: stats.count > 0 ? stats.totalRating / stats.count : 5.0,
      review_count: stats.count
    };
  });
  // --------------------------------

  useEffect(function () {
    async function loadSalonData() {
      try {
        // Load salon details
        var [salonRes, servicesRes, staffRes, reviewsRes] = await Promise.all([
          fetch('/api/marketplace/salons/' + salonId),
          fetch('/api/marketplace/salons/' + salonId + '/services'),
          fetch('/api/marketplace/salons/' + salonId + '/staff'),
          fetch('/api/marketplace/salons/' + salonId + '/reviews'),
        ]);

        if (salonRes.ok) {
          var salonData = await salonRes.json();
          setSalon(salonData.data);
        }
        if (servicesRes.ok) {
          var servicesData = await servicesRes.json();
          setServices(servicesData.data || []);
        }
        if (staffRes.ok) {
          var staffData = await staffRes.json();
          setStaff(staffData.data || []);
        }
        if (reviewsRes.ok) {
          var reviewsData = await reviewsRes.json();
          setReviews(reviewsData.data.reviews || []);
        }
      } catch (error) {
        console.error('Failed to load salon:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSalonData();
  }, [salonId]);

  useEffect(function () {
    if (galleryImages.length <= 1) return;
    var interval = setInterval(function () {
      setActiveImageIndex(function (prev) {
        return (prev + 1) % galleryImages.length;
      });
    }, 5000);
    return function () { clearInterval(interval); };
  }, [galleryImages.length]);

  function formatTime(time) {
    if (!time) return 'Closed';
    var parts = time.split(':');
    var hour = parseInt(parts[0]);
    var min = parts[1];
    var ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return hour + ':' + min + ' ' + ampm;
  }

  function getInitials(name) {
    return name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
  }

  function getStatus(hours) {
    if (!hours || hours.length === 0) return { label: 'Closed', color: 'bg-red-500' };
    var now = new Date();
    var dayOfWeek = now.getDay();
    var currentDay = hours.find(function (h) { return h.day_of_week === dayOfWeek; });

    if (!currentDay || currentDay.is_closed) return { label: 'Closed', color: 'bg-red-500' };

    var nowH = now.getHours();
    var nowM = now.getMinutes();
    var nowTotal = nowH * 60 + nowM;

    function parseTime(t) {
      if (!t) return 0;
      var parts = t.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    var openTotal = parseTime(currentDay.open_time);
    var closeTotal = parseTime(currentDay.close_time);

    if (nowTotal >= openTotal && nowTotal < closeTotal) {
      return { label: 'Open', color: 'bg-green-500 hover:bg-green-600' };
    }
    return { label: 'Closed', color: 'bg-red-500' };
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-64 md:h-80 w-full" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold mb-2">Salon Not Found</h2>
        <p className="text-muted-foreground mb-6">This salon may no longer be available</p>
        <Link href="/salons">
          <Button>Browse Salons</Button>
        </Link>
      </div>
    );
  }

  // Group services by category
  var servicesByCategory = {};
  services.forEach(function (service) {
    var catName = service.category_name || 'Other Services';
    if (!servicesByCategory[catName]) {
      servicesByCategory[catName] = [];
    }
    servicesByCategory[catName].push(service);
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section - Dynamic Gallery Slider */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden bg-muted group/gallery">
        {galleryImages.length > 0 ? (
          <>
            {galleryImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={salon.name}
                className={'absolute inset-0 w-full h-full object-cover transition-all duration-1000 ' + (idx === activeImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110')}
              />
            ))}

            {galleryImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={'w-2 h-2 rounded-full transition-all ' + (idx === activeImageIndex ? 'bg-white w-8 shadow-sm' : 'bg-white/40 hover:bg-white/60')}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
            <span className="text-9xl opacity-20 filter grayscale">💇</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background/90 md:to-background" />

        {/* Action Buttons Layer */}
        <div className="absolute top-6 right-6 flex gap-3 z-10">
          <Button size="icon" variant="secondary" className="rounded-full bg-background/80 backdrop-blur-md border-none shadow-lg hover:bg-background transition-all">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="rounded-full bg-background/80 backdrop-blur-md border-none shadow-lg hover:bg-background transition-all">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Modern Header Card - Floating & Glassmorphism */}
        <div className="relative -mt-32 md:-mt-40 mb-12 z-20">
          <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-white/10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Premium Logo Presentation */}
              <div className="shrink-0 relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-card shadow-xl">
                  {salon.logo_url ? (
                    <img
                      src={salon.logo_url}
                      alt={salon.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold">
                      {salon.name.charAt(0)}
                    </div>
                  )}
                </div>
                {salon.business_hours && (
                  <Badge className={'absolute -bottom-2 -right-2 px-3 py-1 shadow-md border-none text-white ' + getStatus(salon.business_hours).color}>
                    {getStatus(salon.business_hours).label}
                  </Badge>
                )}
              </div>

              {/* Enhanced Info Grid */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{salon.name}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-muted-foreground font-medium">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        {salon.category || 'Beauty & Wellness'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        {salon.city}{salon.state ? ', ' + salon.state : ''}
                      </span>
                      <span className="text-primary font-bold">
                        {Array(salon.price_level || 2).fill('$').join('')}
                      </span>
                    </div>

                    <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
                      <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 stroke-yellow-400" />
                          <span className="text-xl font-bold">{salon.rating?.toFixed(1) || 'New'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          {salon.review_count || 0} Reviews
                        </span>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex flex-col items-center md:items-start">
                        <span className="text-xl font-bold">{services.length}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Services
                        </span>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex flex-col items-center md:items-start">
                        <span className={'text-xl font-bold ' + (salon.rating >= 4.5 ? 'text-green-500' : 'text-primary')}>{salon.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Quality
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch sm:flex-row md:flex-col gap-3 min-w-[200px]">
                    <Link href={'/book/' + salonId} className="w-full">
                      <Button size="lg" className="w-full gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Calendar className="h-5 w-5" />
                        Book Appointment
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-background/50 backdrop-blur-sm">
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-background/50 backdrop-blur-sm">
                        <Clock className="h-4 w-4" />
                        Hours
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Improved Responsive Content Layout */}
        <div className="grid lg:grid-cols-12 gap-12 pb-24">
          {/* Main Content Area (8/12) */}
          <div className="lg:col-span-8 space-y-12">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start mb-8 bg-transparent border-b rounded-none h-auto p-0 gap-8">
                {['services', 'team', 'reviews', 'about'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4 text-base font-medium transition-all capitalize"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Services Tab - Premium Card-per-Category Style */}
              <TabsContent value="services" className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                {Object.entries(servicesByCategory).map(function ([category, categoryServices]) {
                  return (
                    <div key={category} className="space-y-4">
                      <h3 className="text-xl font-bold px-1 flex items-center gap-2">
                        <div className="w-1 h-6 bg-primary rounded-full" />
                        {category}
                      </h3>
                      <div className="grid gap-3">
                        {categoryServices.map(function (service) {
                          return (
                            <div
                              key={service.id}
                              className="group bg-card hover:bg-accent/50 p-5 rounded-2xl border border-border transition-all duration-300 hover:shadow-md hover:border-primary/20"
                            >
                              <div className="flex items-center justify-between gap-6">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                                      {service.name}
                                    </h4>
                                    {service.is_popular && (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] uppercase">
                                        Popular
                                      </Badge>
                                    )}
                                  </div>
                                  {service.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-3">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                      <Clock className="h-3.5 w-3.5" />
                                      {service.duration} min
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-3 shrink-0">
                                  <p className="text-xl font-black text-foreground">
                                    ${parseFloat(service.price).toFixed(2)}
                                  </p>
                                  <Link href={'/book/' + salonId + '?service=' + service.id}>
                                    <Button size="sm" className="rounded-full px-6 font-bold shadow-sm hover:shadow-md group-hover:scale-105 transition-all">
                                      Book
                                      <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {Object.keys(servicesByCategory).length === 0 && (
                  <div className="text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-muted-foreground font-medium">No services listed yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* Team Tab - Circular Premium Avatars */}
              <TabsContent value="team" className="animate-in fade-in slide-in-from-bottom-4">
                <div className="grid sm:grid-cols-2 gap-6">
                  {enrichedStaff.map(function (member) {
                    return (
                      <Card key={member.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <Avatar className="w-20 h-20 md:w-24 md:h-24 ring-4 ring-background shadow-lg transition-transform group-hover:scale-110">
                                <AvatarImage src={member.avatar_url} alt={member.name} className="object-cover" />
                                <AvatarFallback className="text-xl font-bold bg-muted">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xl font-bold truncate group-hover:text-primary transition-colors">
                                {member.name}
                              </h4>
                              {member.title && (
                                <p className="text-sm font-medium text-primary mb-2 line-clamp-1">{member.title}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span>{member.rating?.toFixed(1) || '5.0'}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">({member.review_count || 0} reviews)</span>
                              </div>
                            </div>
                          </div>
                          {member.bio && (
                            <p className="text-sm text-muted-foreground mt-6 leading-relaxed bg-muted/30 p-4 rounded-2xl italic">
                              &quot;{member.bio}&quot;
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {staff.length === 0 && (
                    <div className="col-span-2 text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed">
                      <div className="text-4xl mb-3">🤝</div>
                      <p className="text-muted-foreground font-medium">Team profiles coming soon</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab - Premium Review Cards */}
              <TabsContent value="reviews" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="col-span-1 border-none bg-primary/5 shadow-none rounded-3xl flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-6xl font-black text-primary mb-2">
                      {salon.rating?.toFixed(1) || '—'}
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(function (star) {
                        return (
                          <Star
                            key={star}
                            className={'h-5 w-5 ' + (star <= Math.round(salon.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400 stroke-yellow-400'
                              : 'text-muted-foreground/30')}
                          />
                        );
                      })}
                    </div>
                    <p className="font-bold text-muted-foreground">
                      Based on {salon.review_count || 0} reviews
                    </p>
                  </Card>

                  <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-4">
                        <span className="text-sm font-bold w-4">{rating}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: starPercentages[rating] + '%' }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground font-medium w-8 text-right">
                          {starPercentages[rating]}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.map(function (review) {
                    return (
                      <Card key={review.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8">
                          <div className="flex items-start gap-5">
                            <Avatar className="w-12 h-12 rounded-2xl shadow-md">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {review.client_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h4 className="font-bold text-lg leading-none">{review.client_name || 'Verified Client'}</h4>
                                  <div className="flex items-center mt-1.5">
                                    {[1, 2, 3, 4, 5].map(function (star) {
                                      return (
                                        <Star
                                          key={star}
                                          className={'h-3.5 w-3.5 ' + (star <= review.rating
                                            ? 'fill-yellow-400 text-yellow-400 stroke-yellow-400'
                                            : 'text-muted-foreground/30')}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full uppercase tracking-tighter">
                                  {new Date(review.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              {review.comment && (
                                <p className="text-foreground leading-relaxed font-medium">
                                  {review.comment}
                                </p>
                              )}
                              {review.service_name && (
                                <div className="pt-2">
                                  <Badge variant="secondary" className="bg-accent text-accent-foreground font-bold rounded-lg px-4 py-1.5 border-none">
                                    {review.service_name}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* About Tab - Refined Layout */}
              <TabsContent value="about" className="animate-in fade-in slide-in-from-bottom-4">
                <div className="grid gap-8">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden p-8 space-y-10">
                    {salon.description && (
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <div className="w-2 h-8 bg-primary rounded-full" />
                          Our Story
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                          {salon.description}
                        </p>
                      </div>
                    )}

                    {(salon.amenities && salon.amenities.length > 0) ? (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                          <Check className="h-6 w-6 text-primary" />
                          Salon Amenities
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {salon.amenities.map(function (amenity, idx) {
                            return (
                              <div key={idx} className="flex items-center gap-3 bg-muted/40 p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-colors group">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                  <Check className="h-4 w-4 text-green-500" />
                                </div>
                                <span className="font-bold text-sm tracking-tight">{amenity}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Premium Sidebar (4/12) */}
          <div className="lg:col-span-4 space-y-8 h-fit">
            {/* Elegant Booking Summary Card */}
            <Card className="sticky top-24 border-none shadow-2xl rounded-[2.5rem] overflow-hidden group border-border">
              <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <h3 className="text-2xl font-black">Experience Beauty</h3>
                  <p className="opacity-90 font-medium">Ready for your transformation?</p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-black/10 rounded-full blur-2xl" />
              </div>
              <CardContent className="p-8 space-y-8 bg-card">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-bold opacity-70">
                    <span className={getStatus(salon.business_hours).label === 'Open' ? 'text-green-500' : 'text-red-500'}>
                      {getStatus(salon.business_hours).label === 'Open' ? 'Available Now' : 'Currently Closed'}
                    </span>
                    <span className="text-green-500 opacity-100">Fast Booking</span>
                  </div>
                  <Link href={'/book/' + salonId} className="block">
                    <Button className="w-full py-8 text-xl font-black rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]" size="lg">
                      Book Now
                    </Button>
                  </Link>
                </div>

                <Separator />

                <div className="space-y-6">
                  <h4 className="font-bold text-sm uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Working Hours
                  </h4>
                  <div className="space-y-3">
                    {salon.business_hours?.map(function (hours, idx) {
                      var today = new Date().getDay();
                      var isToday = hours.day_of_week === today;
                      return (
                        <div
                          key={idx}
                          className={'flex justify-between items-center px-4 py-2.5 rounded-xl transition-all ' + (isToday ? 'bg-primary/5 border border-primary/20 scale-105 shadow-sm' : 'hover:bg-muted/30')}
                        >
                          <span className={'text-sm font-bold ' + (isToday ? 'text-primary' : 'text-foreground')}>{DAYS[hours.day_of_week]}</span>
                          <span className={'text-sm font-black ' + (hours.is_closed ? 'text-muted-foreground/50 line-through' : (isToday ? 'text-primary' : 'text-foreground/80'))}>
                            {hours.is_closed
                              ? 'Off'
                              : formatTime(hours.open_time) + ' - ' + formatTime(hours.close_time)}
                          </span>
                        </div>
                      );
                    }) || (
                        <p className="text-muted-foreground">Hours not available</p>
                      )}
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <h4 className="font-bold text-sm uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Our Location
                  </h4>
                  <div className="bg-muted/40 p-6 rounded-3xl border border-transparent hover:border-primary/20 transition-all space-y-4">
                    <div className="space-y-1">
                      <p className="font-black text-lg leading-tight">{salon.address}</p>
                      <p className="font-bold text-muted-foreground">{salon.city}, {salon.state} {salon.postal_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1 rounded-xl bg-background border-none shadow-sm hover:shadow-md">
                        Get Directions
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
