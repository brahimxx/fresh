import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { SalonSearchContent } from '@/components/marketplace/salon-search-content';
import { BUSINESS_CATEGORIES } from '@/lib/constants/categories';

export async function generateMetadata({ params }) {
  const { category } = await params;
  const categoryData = BUSINESS_CATEGORIES.find(c => c.slug === category);
  
  if (!categoryData) {
    return { title: 'Not Found' };
  }

  return {
    title: `Best ${categoryData.label}s | Book Online`,
    description: `Find and book top-rated ${categoryData.label.toLowerCase()}s near you. Read reviews, compare prices, and book instantly.`,
  };
}

export default async function CategorySearchPage({ params }) {
  const { category } = await params;
  const categoryData = BUSINESS_CATEGORIES.find(c => c.slug === category);
  
  if (!categoryData) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <Skeleton className="aspect-[4/3]" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    }>
      <SalonSearchContent initialCategory={categoryData.label} />
    </Suspense>
  );
}