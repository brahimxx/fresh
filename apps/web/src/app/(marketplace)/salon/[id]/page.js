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
  
  useEffect(function() {
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
          setReviews(reviewsData.data || []);
        }
      } catch (error) {
        console.error('Failed to load salon:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSalonData();
  }, [salonId]);
  
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
    return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
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
  services.forEach(function(service) {
    var catName = service.category_name || 'Other Services';
    if (!servicesByCategory[catName]) {
      servicesByCategory[catName] = [];
    }
    servicesByCategory[catName].push(service);
  });
  
  return (
    <div>
      {/* Hero Image */}
      <div className="relative h-64 md:h-80 bg-gray-200">
        {salon.cover_image_url ? (
          <img
            src={salon.cover_image_url}
            alt={salon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-100">
            <span className="text-8xl">💇</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="icon" variant="secondary" className="rounded-full">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="rounded-full">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Salon Header */}
        <div className="relative -mt-20 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Logo */}
              <div className="shrink-0">
                {salon.logo_url ? (
                  <img
                    src={salon.logo_url}
                    alt={salon.name}
                    className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow">
                    {salon.name.charAt(0)}
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{salon.name}</h1>
                    <p className="text-muted-foreground">{salon.category || 'Beauty & Wellness'}</p>
                    
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{salon.rating?.toFixed(1) || 'New'}</span>
                        {salon.review_count > 0 && (
                          <span className="text-muted-foreground">({salon.review_count} reviews)</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{salon.city}{salon.state ? ', ' + salon.state : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href={'/book/' + salonId}>
                    <Button size="lg" className="gap-2">
                      <Calendar className="h-5 w-5" />
                      Book Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-8 pb-16">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>
              
              {/* Services Tab */}
              <TabsContent value="services" className="space-y-6">
                {Object.entries(servicesByCategory).map(function([category, categoryServices]) {
                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle>{category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {categoryServices.map(function(service) {
                          return (
                            <div key={service.id} className="flex items-start justify-between py-3 border-b last:border-0">
                              <div className="flex-1">
                                <h4 className="font-medium">{service.name}</h4>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {service.duration} min
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold">${parseFloat(service.price).toFixed(2)}</p>
                                <Link href={'/book/' + salonId + '?service=' + service.id}>
                                  <Button size="sm" variant="outline" className="mt-2">
                                    Book
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
                
                {services.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No services listed yet
                  </div>
                )}
              </TabsContent>
              
              {/* Team Tab */}
              <TabsContent value="team">
                <div className="grid sm:grid-cols-2 gap-4">
                  {staff.map(function(member) {
                    return (
                      <Card key={member.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={member.avatar_url} alt={member.name} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{member.name}</h4>
                              {member.title && (
                                <p className="text-sm text-muted-foreground">{member.title}</p>
                              )}
                              {member.rating && (
                                <div className="flex items-center gap-1 mt-1 text-sm">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{member.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {member.bio && (
                            <p className="text-sm text-muted-foreground mt-3">{member.bio}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {staff.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      Team information coming soon
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-4">
                {/* Rating Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{salon.rating?.toFixed(1) || '—'}</div>
                        <div className="flex items-center justify-center mt-1">
                          {[1, 2, 3, 4, 5].map(function(star) {
                            return (
                              <Star
                                key={star}
                                className={'h-5 w-5 ' + (star <= Math.round(salon.rating || 0) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-200')}
                              />
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {salon.review_count || 0} reviews
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Review List */}
                {reviews.map(function(review) {
                  return (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {review.client_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{review.client_name || 'Anonymous'}</h4>
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              {[1, 2, 3, 4, 5].map(function(star) {
                                return (
                                  <Star
                                    key={star}
                                    className={'h-4 w-4 ' + (star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-200')}
                                  />
                                );
                              })}
                            </div>
                            {review.comment && (
                              <p className="text-sm mt-2">{review.comment}</p>
                            )}
                            {review.service_name && (
                              <Badge variant="secondary" className="mt-2">
                                {review.service_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {reviews.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews yet
                  </div>
                )}
              </TabsContent>
              
              {/* About Tab */}
              <TabsContent value="about">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {salon.description && (
                      <div>
                        <h3 className="font-semibold mb-2">About</h3>
                        <p className="text-muted-foreground">{salon.description}</p>
                      </div>
                    )}
                    
                    {salon.amenities && salon.amenities.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Amenities</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {salon.amenities.map(function(amenity, idx) {
                            return (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                {amenity}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Book Now Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book an Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={'/book/' + salonId}>
                  <Button className="w-full" size="lg">
                    Book Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {salon.business_hours?.map(function(hours, idx) {
                    var today = new Date().getDay();
                    var isToday = hours.day_of_week === today;
                    return (
                      <div 
                        key={idx} 
                        className={'flex justify-between ' + (isToday ? 'font-medium' : '')}
                      >
                        <span>{DAYS[hours.day_of_week]}</span>
                        <span className={hours.is_closed ? 'text-muted-foreground' : ''}>
                          {hours.is_closed 
                            ? 'Closed' 
                            : formatTime(hours.open_time) + ' - ' + formatTime(hours.close_time)}
                        </span>
                      </div>
                    );
                  }) || (
                    <p className="text-muted-foreground">Hours not available</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {salon.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="text-sm">
                      <p>{salon.address}</p>
                      <p>{salon.city}{salon.state ? ', ' + salon.state : ''} {salon.postal_code}</p>
                    </div>
                  </div>
                )}
                
                {salon.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={'tel:' + salon.phone} className="text-sm hover:underline">
                      {salon.phone}
                    </a>
                  </div>
                )}
                
                {salon.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={salon.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
