'use client';

import Link from 'next/link';
import { Search, MapPin, Star, Clock, ChevronRight, Scissors, Sparkles, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

var FEATURED_CATEGORIES = [
  { name: 'Hair Salons', icon: Scissors, slug: 'hair', count: '2,500+' },
  { name: 'Nail Salons', icon: Sparkles, slug: 'nails', count: '1,800+' },
  { name: 'Spas & Wellness', icon: Heart, slug: 'spa', count: '950+' },
  { name: 'Barbershops', icon: Scissors, slug: 'barber', count: '1,200+' },
];

var POPULAR_SERVICES = [
  'Haircut', 'Hair Coloring', 'Manicure', 'Pedicure',
  'Massage', 'Facial', 'Waxing', 'Eyebrow Threading',
  'Beard Trim', 'Balayage', 'Keratin Treatment', 'Gel Nails'
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [featuredSalons, setFeaturedSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured salons on mount
  useEffect(() => {
    async function fetchFeaturedSalons() {
      try {
        const res = await fetch('/api/marketplace/salons?sort=rating&limit=4');
        if (res.ok) {
          const data = await res.json();
          setFeaturedSalons(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load featured salons:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeaturedSalons();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (locationQuery) params.append('location', locationQuery);
    router.push(`/salons?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Book beauty & wellness near you
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover and book appointments at the best salons, spas, and wellness centers
            </p>

            {/* Search Box */}
            <div className="mt-8 bg-card rounded-xl shadow-lg p-4 border">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Service or salon name..."
                    className="pl-10 h-12 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="relative flex-1 md:max-w-xs">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="City or zip code"
                    className="pl-10 h-12 text-base"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button size="lg" className="w-full md:w-auto h-12 px-8" onClick={handleSearch}>
                  Search
                </Button>
              </div>

              {/* Popular Services */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="text-sm text-muted-foreground">Popular:</span>
                {POPULAR_SERVICES.slice(0, 6).map(function (service) {
                  return (
                    <Link key={service} href={'/salons?q=' + encodeURIComponent(service)}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {service}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Browse by Category</h2>
            <Link href="/salons" className="text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURED_CATEGORIES.map(function (cat) {
              var Icon = cat.icon;
              return (
                <Link key={cat.slug} href={'/salons?category=' + cat.slug}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat.count} venues</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Salons */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Featured Salons</h2>
              <p className="text-muted-foreground mt-1">Top-rated venues in your area</p>
            </div>
            <Link href="/salons" className="text-primary font-medium flex items-center gap-1 hover:underline">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <Skeleton className="aspect-[4/3]" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredSalons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredSalons.map(function (salon) {
                return (
                  <Link key={salon.id} href={'/salon/' + salon.id}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {salon.cover_image_url ? (
                          <img
                            src={salon.cover_image_url}
                            alt={salon.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            💇
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold truncate">{salon.name}</h3>
                            <p className="text-sm text-muted-foreground">{salon.category || 'Salon'}</p>
                          </div>
                          {salon.price_level && (
                            <Badge variant="secondary">{'$'.repeat(salon.price_level)}</Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{salon.rating ? salon.rating.toFixed(1) : 'New'}</span>
                          {salon.review_count > 0 && (
                            <span className="text-muted-foreground">({salon.review_count} reviews)</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {salon.city}{salon.state ? ', ' + salon.state : ''}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No featured salons found at the moment.
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2">Book your next appointment in 3 easy steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Search</h3>
              <p className="text-muted-foreground">
                Find salons and services near you with our easy search
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Book</h3>
              <p className="text-muted-foreground">
                Choose your service, staff, and time slot instantly
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Enjoy</h3>
              <p className="text-muted-foreground">
                Arrive at your appointment and enjoy your experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Are you a salon owner?</h2>
          <p className="mt-2 text-foreground/80 max-w-xl mx-auto">
            Join thousands of businesses using our platform to manage bookings and grow their clientele
          </p>
          <Link href="/register?role=owner">
            <Button size="lg" variant="secondary" className="mt-6">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
