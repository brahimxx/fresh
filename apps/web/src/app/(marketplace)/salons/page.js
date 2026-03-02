'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search, MapPin, Star, Filter, SlidersHorizontal,
  ChevronDown, X, Clock, Grid, List as ListIcon,
  Map as MapIcon, EyeOff, Eye
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SearchBar } from '@/components/marketplace/search-bar';

// Dynamic import to avoid SSR issues with mapbox-gl
const SalonMap = dynamic(
  () => import('@/components/marketplace/salon-map').then(mod => ({ default: mod.SalonMap })),
  { ssr: false, loading: () => <div className="w-full h-full min-h-[500px] bg-muted animate-pulse rounded-xl" /> }
);

var CATEGORIES = [
  { id: 'hair', name: 'Hair Salons' },
  { id: 'nails', name: 'Nail Salons' },
  { id: 'spa', name: 'Spas & Wellness' },
  { id: 'barber', name: 'Barbershops' },
  { id: 'beauty', name: 'Beauty Salons' },
  { id: 'massage', name: 'Massage' },
];

var PRICE_RANGES = [
  { id: '1', label: '$', description: 'Budget-friendly' },
  { id: '2', label: '$$', description: 'Moderate' },
  { id: '3', label: '$$$', description: 'Upscale' },
  { id: '4', label: '$$$$', description: 'Luxury' },
];

var SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

function SalonSearchContent() {
  var searchParams = useSearchParams();
  var router = useRouter();

  var [salons, setSalons] = useState([]);
  var [loading, setLoading] = useState(true);
  var [viewMode, setViewMode] = useState('grid');
  
  // Map visibility — persisted in sessionStorage
  var [showMap, setShowMap] = useState(() => {
    if (typeof window !== 'undefined') {
      var saved = sessionStorage.getItem('salons-show-map');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default to showing map
  });
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Filter states
  var [query, setQuery] = useState(searchParams.get('q') || '');
  var [location, setLocation] = useState(searchParams.get('location') || '');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setLocation(searchParams.get('location') || '');
  }, [searchParams]);

  var [selectedCategories, setSelectedCategories] = useState(
    searchParams.get('category')?.split(',').filter(Boolean) || []
  );
  var [selectedPrices, setSelectedPrices] = useState(
    searchParams.get('price')?.split(',').filter(Boolean) || []
  );
  var [minRating, setMinRating] = useState(null);
  var [sortBy, setSortBy] = useState('recommended');
  var [openNow, setOpenNow] = useState(false);

  // Persist map visibility
  useEffect(() => {
    sessionStorage.setItem('salons-show-map', showMap.toString());
  }, [showMap]);

  // Load salons
  useEffect(function () {
    async function loadSalons() {
      setLoading(true);
      try {
        var params = new URLSearchParams();
        if (query) params.append('q', query);
        if (location) params.append('location', location);
        if (selectedCategories.length) params.append('categories', selectedCategories.join(','));
        if (selectedPrices.length) params.append('price', selectedPrices.join(','));
        if (minRating) params.append('minRating', minRating);
        if (openNow) params.append('openNow', 'true');
        params.append('sort', sortBy);

        var res = await fetch('/api/marketplace/salons?' + params.toString());
        if (res.ok) {
          var data = await res.json();
          setSalons(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load salons:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSalons();
  }, [query, location, selectedCategories, selectedPrices, minRating, sortBy, openNow]);

  function toggleCategory(catId) {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(function (c) { return c !== catId; }));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  }

  function togglePrice(priceId) {
    if (selectedPrices.includes(priceId)) {
      setSelectedPrices(selectedPrices.filter(function (p) { return p !== priceId; }));
    } else {
      setSelectedPrices([...selectedPrices, priceId]);
    }
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedPrices([]);
    setMinRating(null);
    setOpenNow(false);
  }

  var activeFilterCount = selectedCategories.length + selectedPrices.length + (minRating ? 1 : 0) + (openNow ? 1 : 0);

  // Determine grid columns based on map visibility
  const gridCols = showMap
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Split Layout: Results + Map */}
      <div className={`flex gap-6 ${showMap ? '' : ''}`}>
        {/* Left Column: Results Grid (hidden when map expands) */}
        {!isMapExpanded && (
          <div className={showMap ? 'flex-1 min-w-0' : 'w-full'}>
            <Breadcrumbs className="mb-4" />
            
            {/* Search Header */}
            <div className="mb-6">
              
              {/* Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 md:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1">{activeFilterCount}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Category</h4>
                  <div className="space-y-2">
                    {CATEGORIES.map(function (cat) {
                      return (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={'mob-cat-' + cat.id}
                            checked={selectedCategories.includes(cat.id)}
                            onCheckedChange={function () { toggleCategory(cat.id); }}
                          />
                          <Label htmlFor={'mob-cat-' + cat.id}>{cat.name}</Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Price Range</h4>
                  <div className="flex gap-2">
                    {PRICE_RANGES.map(function (price) {
                      return (
                        <Button
                          key={price.id}
                          variant={selectedPrices.includes(price.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={function () { togglePrice(price.id); }}
                        >
                          {price.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Minimum Rating</h4>
                  <div className="flex gap-2">
                    {[4, 4.5].map(function (rating) {
                      return (
                        <Button
                          key={rating}
                          variant={minRating === rating ? 'default' : 'outline'}
                          size="sm"
                          className="gap-1"
                          onClick={function () { setMinRating(minRating === rating ? null : rating); }}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {rating}+
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mob-open-now"
                    checked={openNow}
                    onCheckedChange={function (checked) { setOpenNow(checked); }}
                  />
                  <Label htmlFor="mob-open-now">Open Now</Label>
                </div>
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center gap-2">
            <Select value={minRating ? minRating.toString() : "any"} onValueChange={(val) => setMinRating(val === "any" ? null : parseFloat(val))}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rating</SelectItem>
                <SelectItem value="4">4.0+ Stars</SelectItem>
                <SelectItem value="4.5">4.5+ Stars</SelectItem>
                <SelectItem value="4.8">4.8+ Stars</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={openNow ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={function () { setOpenNow(!openNow); }}
            >
              <Clock className="h-3 w-3" />
              Open Now
            </Button>
          </div>

          <div className="flex-1" />

          {/* Map Toggle */}
          <Button
            variant='outline'
            size="sm"
            className="gap-2 hidden lg:flex"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? <EyeOff className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
            {showMap ? 'Hide Map' :   'Show Map'}
          </Button>

          {/* Sort & View */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(function (option) {
                return (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="hidden sm:flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={function () { setViewMode('grid'); }}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={function () { setViewMode('list'); }}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedCategories.map(function (catId) {
              var cat = CATEGORIES.find(function (c) { return c.id === catId; });
              return (
                <Badge key={catId} variant="secondary" className="gap-1">
                  {cat?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={function () { toggleCategory(catId); }} />
                </Badge>
              );
            })}
            {openNow && (
              <Badge variant="secondary" className="gap-1">
                Open Now
                <X className="h-3 w-3 cursor-pointer" onClick={function () { setOpenNow(false); }} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-muted-foreground">
          {loading ? 'Searching...' : salons.length + ' salons found'}
              </p>
            </div>

            {loading ? (
              <div className={`grid ${gridCols} gap-6`}>
                {[1, 2, 3, 4, 5, 6].map(function (i) {
                  return viewMode === 'grid' ? (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="w-full aspect-[4/3]" />
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card key={i} className="flex">
                      <Skeleton className="w-48 h-36" />
                      <CardContent className="flex-1 p-4 space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : salons.length > 0 ? (
              <div className={viewMode === 'grid' ? `grid ${gridCols} gap-6` : 'space-y-4'}>
                {salons.map(function (salon) {
                  return viewMode === 'grid' ? (
                    <SalonCardGrid key={salon.id} salon={salon} />
                  ) : (
                    <SalonCardList key={salon.id} salon={salon} />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No salons found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Map Panel */}
        {showMap && (
          <div className={
            isMapExpanded
              ? "w-full h-[calc(100vh-7rem)] rounded-xl overflow-hidden" 
              : "hidden lg:block w-[480px] xl:w-[560px] shrink-0 sticky top-20 h-[calc(100vh-7rem)] rounded-xl overflow-hidden"
          }>
            <SalonMap
              salons={salons}
              searchLocation={location ? { lat: null, lng: null } : null}
              className="w-full h-full"
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SalonCardGrid({ salon }) {
  return (
    <Link href={'/salon/' + salon.id} className="block h-full w-full">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full">
        <div className="aspect-4/3 overflow-hidden bg-muted">
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
              <h3 className="font-semibold group-hover:text-primary transition-colors">{salon.name}</h3>
              <p className="text-sm text-muted-foreground">{salon.category || 'Salon'}</p>
            </div>
            {salon.price_level && (
              <Badge variant="secondary">{'$'.repeat(salon.price_level)}</Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{salon.rating?.toFixed(1) || 'New'}</span>
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
}

function SalonCardList({ salon }) {
  return (
    <Link href={'/salon/' + salon.id} className="block w-full">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="flex">
          <div className="w-48 h-36 shrink-0 overflow-hidden bg-muted">
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
          <CardContent className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{salon.name}</h3>
                <p className="text-sm text-muted-foreground">{salon.category || 'Salon'}</p>
              </div>
              {salon.price_level && (
                <Badge variant="secondary">{'$'.repeat(salon.price_level)}</Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{salon.rating?.toFixed(1) || 'New'}</span>
              {salon.review_count > 0 && (
                <span className="text-muted-foreground">({salon.review_count} reviews)</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {salon.address || salon.city}
            </div>
            {salon.services_preview && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {salon.services_preview.slice(0, 3).map(function (service, idx) {
                  return (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

export default function SalonsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(function (i) {
            return (
              <Card key={i}>
                <Skeleton className="aspect-[4/3]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    }>
      <SalonSearchContent />
    </Suspense>
  );
}
