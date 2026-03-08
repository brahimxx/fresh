'use client';

import Link from 'next/link';
import { Search, MapPin, Star, Clock, ChevronRight, Scissors, Sparkles, Heart, ArrowRight, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/marketplace/search-bar';
import { SalonCard } from '@/components/marketplace/salon-card';
import { useMarketplaceSalons } from '@/hooks/use-marketplace';

var FEATURED_CATEGORIES = [
  { name: 'Hair Salons', icon: Scissors, slug: 'hair', count: '2,500+', gradient: 'from-rose-500/20 to-pink-500/20' },
  { name: 'Nail Salons', icon: Sparkles, slug: 'nails', count: '1,800+', gradient: 'from-violet-500/20 to-purple-500/20' },
  { name: 'Spas & Wellness', icon: Heart, slug: 'spa', count: '950+', gradient: 'from-emerald-500/20 to-teal-500/20' },
  { name: 'Barbershops', icon: Scissors, slug: 'barber', count: '1,200+', gradient: 'from-amber-500/20 to-orange-500/20' },
];



var TRUST_STATS = [
  { value: '10,000+', label: 'Happy Clients' },
  { value: '500+', label: 'Partner Salons' },
  { value: '4.9', label: 'Average Rating' },
  { value: '50,000+', label: 'Bookings Made' },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(function () { setMounted(true); }, []);

  // Fetch featured salons using TanStack Query
  const { data: featuredSalons = [], isLoading: loading } = useMarketplaceSalons(
    { sort: 'rating', limit: 4 }
  );



  return (
    <div className="overflow-hidden">
      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center gap-10 relative pt-24 pb-32 md:pt-32 md:pb-48">
        {/* Animated background gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-3xl animate-blob"
            style={{
              background: 'radial-gradient(circle, oklch(0.65 0.19 15 / 40%) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-3xl animate-blob animation-delay-2000"
            style={{
              background: 'radial-gradient(circle, oklch(0.65 0.17 280 / 30%) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute md:top-[20%] right-[10%] w-[40%] h-[40%] rounded-full opacity-20 blur-3xl animate-blob animation-delay-4000"
            style={{
              background: 'radial-gradient(circle, oklch(0.7 0.1 200 / 40%) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center mx-auto">
            {/* Animated heading */}
            <div
              className="transition-all duration-1000 ease-out flex flex-col items-center"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
              }}
            >
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur-md border-primary/20 text-primary">
                <Sparkles className="w-4 h-4 mr-2 inline-block -mt-0.5" />
                The easiest way to book beauty services
              </Badge>

              <h1 className="text-nowrap text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight md:leading-[1.1] text-foreground">
                Book beauty &
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500"> wellness </span>
                near you
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover and book appointments at the best salons, spas, and wellness centers — all in one place.
              </p>
            </div>

            {/* Animated search box */}
            <div
              className="transition-all duration-1000 ease-out delay-200 mt-10 md:mt-12 w-full max-w-4xl mx-auto"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
              }}
            >
              <div className="relative z-50 bg-white/40 dark:bg-black/40 backdrop-blur-2xl p-2 md:p-3 rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                <SearchBar size="lg" className="w-full" />
              </div>

              {/* Quick Search Pills */}
              <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-6">
                {['Haircut', 'Coloring', 'Manicure', 'Massage', 'Facial'].map((service, idx) => (
                  <button
                    key={service}
                    className="px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 shadow-sm"
                    onClick={() => {
                      router.push(`/salons?q=${encodeURIComponent(service)}`);
                    }}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Stats ──────────────────────────────────────────────── */}
      <section className="py-8 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {TRUST_STATS.map(function (stat, i) {
              return (
                <div
                  key={stat.label}
                  className="transition-all duration-700 ease-out"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: (300 + i * 100) + 'ms',
                  }}
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Categories Section ───────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Browse by Category</h2>
              <p className="text-muted-foreground mt-1">Find the perfect service for you</p>
            </div>
            <Link href="/salons" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {FEATURED_CATEGORIES.map(function (cat, i) {
              var Icon = cat.icon;
              return (
                <Link key={cat.slug} href={'/salons?category=' + cat.slug}>
                  <Card
                    className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden relative"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                      transition: 'all 0.5s ease-out',
                      transitionDelay: (200 + i * 100) + 'ms',
                    }}
                  >
                    <CardContent className="p-6 md:p-8 text-center relative z-10">
                      <div className={'w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ' + cat.gradient + ' flex items-center justify-center group-hover:scale-110 transition-transform duration-300'}>
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{cat.count} venues</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Featured Salons ──────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Featured Salons</h2>
              <p className="text-muted-foreground mt-1">Top-rated venues in your area</p>
            </div>
            <Link href="/salons" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(function (i) {
                return (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-4/3" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : featuredSalons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredSalons.map(function (salon, i) {
                return (
                  <SalonCard
                    key={salon.id}
                    salon={salon}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                      transition: 'all 0.6s ease-out',
                      transitionDelay: (300 + i * 100) + 'ms',
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
              <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No featured salons yet</p>
              <p className="text-sm mt-1">Check back soon for top-rated venues</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2 text-lg">Book your next appointment in 3 easy steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {[
              { step: '1', title: 'Search', desc: 'Find salons and services near you with our intelligent search', icon: Search },
              { step: '2', title: 'Book', desc: 'Choose your service, staff, and time slot — confirmed instantly', icon: Clock },
              { step: '3', title: 'Enjoy', desc: 'Arrive at your appointment and enjoy a premium experience', icon: CheckCircle },
            ].map(function (item, i) {
              var StepIcon = item.icon;
              return (
                <div
                  key={item.step}
                  className="text-center relative"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.6s ease-out',
                    transitionDelay: (400 + i * 150) + 'ms',
                  }}
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/25 relative z-10">
                    <StepIcon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle at 70% 50%, oklch(0.65 0.19 15 / 30%) 0%, transparent 50%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold">Are you a salon owner?</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Join thousands of businesses using Fresh to manage bookings, grow their clientele, and streamline their operations.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=owner">
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <Link href="/help">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold hover:-translate-y-0.5 transition-all">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Keyframes for background animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.1) translate(2%, 3%); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
           animation: blob 15s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
           animation-delay: 2s;
        }
        .animation-delay-4000 {
           animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
