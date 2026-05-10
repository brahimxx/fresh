"use client";

import { use } from "react";
import { decodeId } from "@/lib/id";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateSalonSlug } from "@/lib/utils";
import { MapPin, Star, ChevronRight } from "lucide-react";


// Hooks
import {
  useSalonDetails,
  useSalonServices,
  useSalonStaff,
  useSalonReviews,
} from "@/hooks/use-marketplace";

// Modular UI Components
import SalonHero from "@/components/marketplace/salon-hero";
import SalonNavigation from "@/components/marketplace/salon-navigation";
import SalonServices from "@/components/marketplace/salon-services";
import SalonReviews from "@/components/marketplace/salon-reviews";
import SalonAbout from "@/components/marketplace/salon-about";
import { SalonCard } from "@/components/marketplace/salon-card";
import SalonLocation from "@/components/marketplace/salon-location";
import SalonStickyBooking from "@/components/marketplace/salon-sticky-booking";

export default function SalonProfilePage({ params }) {
  const resolvedParams = use(params);
  // Extract ID from the SEO slug (e.g. "best-hair-salon-paris-163" -> "163")
  const slugId = resolvedParams.slug.split("-").pop();
  const salonId = decodeId(slugId);

  // Data fetching using React Query
  const { data: salon, isLoading: isSalonLoading } = useSalonDetails(salonId);
  const { data: services = [], isLoading: isServicesLoading } = useSalonServices(salonId);
  const { data: staff = [], isLoading: isStaffLoading } = useSalonStaff(salonId);
  const { data: reviews = [], isLoading: isReviewsLoading } = useSalonReviews(salonId);

  const isLoading = isSalonLoading || isServicesLoading || isStaffLoading || isReviewsLoading;

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen pb-24">
        <Skeleton className="h-[300px] md:h-[400px] w-full" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-12 w-3/4 max-w-lg" />
          <Skeleton className="h-6 w-1/2 max-w-md" />
          <div className="grid lg:grid-cols-12 gap-12 mt-12">
            <div className="lg:col-span-8 space-y-12">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <div className="lg:col-span-4 hidden lg:block">
              <Skeleton className="h-96 rounded-[2.5rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center flex flex-col items-center">
        <div className="text-7xl mb-6">😕</div>
        <h2 className="text-3xl font-black mb-3">Salon Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
          This salon may have been removed, closed, or the link is incorrect.
        </p>
        <Link href="/salons">
          <Button size="lg" className="rounded-full font-bold px-8">
            Browse All Salons
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate staff enrichment with ratings based on reviews
  const staffStats = {};
  reviews.forEach((r) => {
    if (r.staff_id) {
      if (!staffStats[r.staff_id]) {
        staffStats[r.staff_id] = { totalRating: 0, count: 0 };
      }
      staffStats[r.staff_id].totalRating += r.rating;
      staffStats[r.staff_id].count++;
    }
  });

  const enrichedStaff = staff.map((s) => {
    const stats = staffStats[s.id] || { totalRating: 0, count: 0 };
    return {
      ...s,
      rating: stats.count > 0 ? stats.totalRating / stats.count : 5.0,
      review_count: stats.count,
    };
  });

  return (
    <div className="bg-background min-h-screen relative pb-24 md:pb-0">
      <SalonHero salon={salon} servicesCount={services.length} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-12">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-16">
            <SalonNavigation />
            
            <section id="services" className="scroll-mt-28">
              <SalonServices salon={salon} services={services} />
            </section>
            
            <section id="reviews" className="scroll-mt-28">
              <SalonReviews salon={salon} reviews={reviews} />
            </section>
            
            <section id="about" className="scroll-mt-28">
              <SalonAbout salon={salon} staff={enrichedStaff} />
            </section>
            
            <section id="location" className="scroll-mt-28">
              <SalonLocation salon={salon} />
            </section>
          </div>

          {/* Right Column - Premium Sidebar */}
          <div className="lg:col-span-4 hidden lg:block">
            <SalonStickyBooking salon={salon} />
          </div>
        </div>

        {/* Similar Businesses Suggestions */}
        {salon.similar_salons?.length > 0 && (
          <div className="pt-24 pb-24 border-t border-muted mt-24">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight">
                  Other{" "}
                  {salon.categories?.length > 0
                    ? salon.categories.find((c) => c.is_primary)?.category_name || salon.categories[0].category_name
                    : "Salons"}{" "}
                  in {salon.city}
                </h3>
                <p className="text-lg text-muted-foreground font-medium">
                  Explore more options in your area
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {salon.similar_salons.map((similar, idx) => (
                  <SalonCard 
                    key={idx} 
                    salon={{ 
                      ...similar, 
                      rating: similar.avg_rating,
                      category: salon.categories?.find((c) => c.is_primary)?.category_name || salon.categories?.[0]?.category_name
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar for Mobile */}
      <div className="lg:hidden">
        <SalonStickyBooking salon={salon} isMobile={true} />
      </div>
    </div>
  );
}
