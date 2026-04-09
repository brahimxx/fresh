import { getOne } from '@/lib/db';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const idStr = String(slug).split('-').pop();
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return { title: 'Salon Not Found' };
  }

  // A very fast cached DB read since it's server-side Next.js
  const salon = await getOne(
    `SELECT 
      s.name, s.city, s.description,
      (SELECT category_name FROM salon_categories WHERE salon_id = s.id AND is_primary = 1 LIMIT 1) as primary_category
     FROM salons s 
     WHERE s.id = ? AND s.is_active = 1 AND s.is_marketplace_enabled = 1 AND s.deleted_at IS NULL`,
    [id]
  );

  if (!salon) {
    return { title: 'Salon Not Found' };
  }

  const categoryLabel = salon.primary_category || 'Beauty & Wellness';
  const location = salon.city ? ` in ${salon.city}` : '';
  const desc = salon.description 
    ? salon.description.substring(0, 160) 
    : `Book appointments at ${salon.name}${location}. View services, pricing, and availability online.`;

  return {
    title: `${salon.name} - ${categoryLabel}${location} | Book Online`,
    description: desc,
    openGraph: {
      title: `${salon.name} - ${categoryLabel} | Book Online`,
      description: desc,
      type: 'website',
    }
  };
}

export default function SalonLayout({ children }) {
  // Pass through the children (the client-side page component)
  return (
    <>
      {children}
    </>
  );
}