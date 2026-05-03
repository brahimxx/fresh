import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDuration } from "@/lib/format";
import { Clock, ChevronRight, Car, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SalonServices({ salon, services }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const servicesByCategory = useMemo(() => {
    const categories = { All: services };
    services.forEach((service) => {
      const catName = service.category_name || "Other";
      if (!categories[catName]) {
        categories[catName] = [];
      }
      categories[catName].push(service);
    });
    return categories;
  }, [services]);

  const categories = Object.keys(servicesByCategory);
  const displayedServices = servicesByCategory[activeCategory] || [];

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed">
        <div className="text-4xl mb-3">✨</div>
        <p className="text-muted-foreground font-medium">
          No services listed yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Category Pills Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === category
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Services List */}
      <div className="grid gap-3">
        {displayedServices.map((service) => (
          <div
            key={service.id}
            className="group bg-card hover:bg-accent/50 p-5 rounded-2xl border border-border transition-all duration-300 hover:shadow-md hover:border-primary/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                    {service.name}
                  </h4>
                  {service.is_popular && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] uppercase"
                    >
                      Popular
                    </Badge>
                  )}
                  {service.can_mobile && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      Mobile
                    </Badge>
                  )}
                  {service.can_virtual && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 text-[10px] flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      Virtual
                    </Badge>
                  )}
                </div>
                
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    {service.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(service.duration)}
                  </span>
                  
                  {service.can_mobile && service.mobile_price_override && (
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Mobile: {formatCurrency(service.mobile_price_override, salon.currency)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 mt-4 sm:mt-0">
                <p className="text-xl font-black text-foreground">
                  {formatCurrency(service.price, salon.currency)}
                </p>
                <Link
                  href={`/book/${salon.id}?service=${service.id}`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-6 font-bold border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20 group-hover:scale-105 transition-all duration-300"
                  >
                    Book
                    <ChevronRight className="h-4 w-4 ml-0.5 -mr-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
