"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Star,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  Clock,
  Grid,
  List as ListIcon,
  Map as MapIcon,
  EyeOff,
  Eye,
  Car,
  Monitor,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SearchBar } from "@/components/marketplace/search-bar";
import { SalonCard } from "@/components/marketplace/salon-card";
import { LocationModal } from "@/components/ui/location-modal";
import { BUSINESS_CATEGORIES } from "@/lib/constants/categories";
import { generateSalonSlug } from "@/lib/utils";

// Dynamic import to avoid SSR issues with mapbox-gl
const SalonMap = dynamic(
  () =>
    import("@/components/marketplace/salon-map").then((mod) => ({
      default: mod.SalonMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] bg-muted animate-pulse rounded-xl" />
    ),
  },
);

var PRICE_RANGES = [
  { id: "1", label: "$", description: "Budget-friendly" },
  { id: "2", label: "$$", description: "Moderate" },
  { id: "3", label: "$$$", description: "Upscale" },
  { id: "4", label: "$$$$", description: "Luxury" },
];

var SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviews" },
  { value: "distance", label: "Nearest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

export function SalonSearchContent({ initialCategory, initialCity }) {
  var searchParams = useSearchParams();
  var router = useRouter();

  var [salons, setSalons] = useState([]);
  var [loading, setLoading] = useState(true);
  var [viewMode, setViewMode] = useState("grid");

  // Map visibility — persisted in sessionStorage
  var [showMap, setShowMap] = useState(() => {
    if (typeof window !== "undefined") {
      var saved = sessionStorage.getItem("salons-show-map");
      if (saved !== null) return saved === "true";
    }
    return true; // Default to showing map
  });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [hoveredSalonId, setHoveredSalonId] = useState(null);

  // Filter states
  var [query, setQuery] = useState(searchParams.get("q") || "");
  var [location, setLocation] = useState(
    searchParams.get("location") || initialCity || "",
  );
  var [bounds, setBounds] = useState({
    minLat: searchParams.get("minLat"),
    maxLat: searchParams.get("maxLat"),
    minLng: searchParams.get("minLng"),
    maxLng: searchParams.get("maxLng"),
  });
  var [userLocation, setUserLocation] = useState({
    lat: searchParams.get("userLat"),
    lng: searchParams.get("userLng"),
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingSalonForMobile, setPendingSalonForMobile] = useState(null);
  const [hasExactLocation, setHasExactLocation] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("fresh_mobile_service_location");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.lat && parsed.lng && parsed.address) {
            setHasExactLocation(true);
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleCardClick = (salon) => {
    if (isMobile && !hasExactLocation) {
      setPendingSalonForMobile(salon);
      setShowLocationModal(true);
    } else {
      router.push("/salon/" + generateSalonSlug(salon));
    }
  };

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setLocation(searchParams.get("location") || initialCity || "");
    setBounds({
      minLat: searchParams.get("minLat"),
      maxLat: searchParams.get("maxLat"),
      minLng: searchParams.get("minLng"),
      maxLng: searchParams.get("maxLng"),
    });
    setUserLocation({
      lat: searchParams.get("userLat"),
      lng: searchParams.get("userLng"),
    });
  }, [searchParams, initialCity]);

  var [selectedCategories, setSelectedCategories] = useState(() => {
    var fromUrl = searchParams.get("category");
    if (fromUrl) return fromUrl.split(",").filter(Boolean);
    if (initialCategory) return [initialCategory];
    return [];
  });
  var [selectedPrices, setSelectedPrices] = useState(
    searchParams.get("price")?.split(",").filter(Boolean) || [],
  );
  var [minRating, setMinRating] = useState(null);
  var [sortBy, setSortBy] = useState("recommended");
  var [openNow, setOpenNow] = useState(false);
  var [isPhysical, setIsPhysical] = useState(false);
  var [isMobile, setIsMobile] = useState(false);
  var [isVirtual, setIsVirtual] = useState(false);

  // Persist map visibility
  useEffect(() => {
    sessionStorage.setItem("salons-show-map", showMap.toString());
  }, [showMap]);

  const [isMapDragging, setIsMapDragging] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Load salons
  useEffect(
    function () {
      async function loadSalons(isBackgroundLoad = false) {
        if (!isBackgroundLoad) {
          setLoading(true);
        } else {
          setIsMapLoading(true);
        }
        try {
          var params = new URLSearchParams();
          if (query) params.append("q", query);
          if (
            location &&
            location !== "Map area" &&
            !location.startsWith("Current Location") &&
            !location.startsWith("Near ")
          )
            params.append("location", location);
          if (bounds.minLat) params.append("minLat", bounds.minLat);
          if (bounds.maxLat) params.append("maxLat", bounds.maxLat);
          if (bounds.minLng) params.append("minLng", bounds.minLng);
          if (bounds.maxLng) params.append("maxLng", bounds.maxLng);
          // Pass user coordinates so the API can derive nearby bounds
          // when no explicit map bounds are set (e.g. "Current Location" search)
          if (userLocation.lat) params.append("userLat", userLocation.lat);
          if (userLocation.lng) params.append("userLng", userLocation.lng);
          if (selectedCategories.length)
            params.append("categories", selectedCategories.join(","));
          if (selectedPrices.length)
            params.append("price", selectedPrices.join(","));
          if (minRating) params.append("minRating", minRating);
          if (openNow) params.append("openNow", "true");
          if (isPhysical) params.append("isPhysical", "true");
          if (isMobile) params.append("isMobile", "true");
          if (isVirtual) params.append("isVirtual", "true");
          params.append("sort", sortBy);

          var res = await fetch("/api/marketplace/salons?" + params.toString());
          if (res.ok) {
            var data = await res.json();
            setSalons(data.data || []);
          }
        } catch (error) {
          console.error("Failed to load salons:", error);
        } finally {
          if (!isBackgroundLoad) {
            setLoading(false);
          } else {
            setIsMapLoading(false);
          }
        }
      }
      loadSalons(isMapDragging);

      // Reset dragging state after the load
      if (isMapDragging) {
        setIsMapDragging(false);
      }
    },
    [
      query,
      location,
      bounds,
      userLocation,
      selectedCategories,
      selectedPrices,
      minRating,
      sortBy,
      openNow,
      isPhysical,
      isMobile,
      isVirtual,
    ],
  );

  function handleBoundsChange(newBounds) {
    setIsMapDragging(true); // Flag that this interaction came from the map

    // Update local state immediately to avoid one render/fetch cycle
    // using the previous searched city before URL params catch up.
    setLocation("Map area");
    setBounds(newBounds);
    setUserLocation({ lat: null, lng: null });

    const params = new URLSearchParams(searchParams.toString());
    params.set("location", "Map area");
    params.set("minLat", newBounds.minLat);
    params.set("maxLat", newBounds.maxLat);
    params.set("minLng", newBounds.minLng);
    params.set("maxLng", newBounds.maxLng);
    params.delete("userLat");
    params.delete("userLng");

    // Replace URL without scrolling to top
    router.replace(`/salons?${params.toString()}`, { scroll: false });
  }

  function toggleCategory(catId) {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(
        selectedCategories.filter(function (c) {
          return c !== catId;
        }),
      );
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  }

  function togglePrice(priceId) {
    if (selectedPrices.includes(priceId)) {
      setSelectedPrices(
        selectedPrices.filter(function (p) {
          return p !== priceId;
        }),
      );
    } else {
      setSelectedPrices([...selectedPrices, priceId]);
    }
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedPrices([]);
    setMinRating(null);
    setOpenNow(false);
    setIsPhysical(false);
    setIsMobile(false);
    setIsVirtual(false);
  }

  var activeFilterCount =
    selectedCategories.length +
    selectedPrices.length +
    (minRating ? 1 : 0) +
    (openNow ? 1 : 0) +
    (isPhysical ? 1 : 0) +
    (isMobile ? 1 : 0) +
    (isVirtual ? 1 : 0);

  // Determine grid columns based on map visibility
  const gridCols = showMap
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Split Layout: Results + Map */}
      <div className={`flex gap-6 ${showMap ? "" : ""}`}>
        {/* Left Column: Results Grid (hidden when map expands) */}
        {!isMapExpanded && (
          <div className={showMap ? "flex-1 min-w-0" : "w-full"}>
            <div className="sticky top-16 z-30 bg-background -mt-6 pt-6 pb-4 mb-2">
              <Breadcrumbs className="mb-4" />

              {/* Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge className="ml-1">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[340px] p-0 flex flex-col h-full"
                  >
                    <SheetHeader className="p-6 border-b border-border/50 bg-muted/20">
                      <SheetTitle className="text-xl font-bold">
                        Filters
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                      <div>
                        <h4 className="text-sm font-semibold mb-4 text-foreground/80 uppercase tracking-wide">
                          Categories
                        </h4>
                        <div className="space-y-3">
                          {BUSINESS_CATEGORIES.map(function (cat) {
                            return (
                              <div
                                key={cat.id}
                                className="flex items-center space-x-3 group"
                              >
                                <Checkbox
                                  id={"mob-cat-" + cat.slug}
                                  checked={selectedCategories.includes(
                                    cat.label,
                                  )}
                                  onCheckedChange={function () {
                                    toggleCategory(cat.label);
                                  }}
                                  className="h-5 w-5 rounded-md border-border text-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label
                                  htmlFor={"mob-cat-" + cat.slug}
                                  className="cursor-pointer text-base font-medium group-hover:text-primary transition-colors flex-1"
                                >
                                  {cat.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-8">
                        <h4 className="text-sm font-semibold mb-4 text-foreground/80 uppercase tracking-wide">
                          Price Range
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {PRICE_RANGES.map(function (price) {
                            return (
                              <Button
                                key={price.id}
                                variant={
                                  selectedPrices.includes(price.id)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={function () {
                                  togglePrice(price.id);
                                }}
                                className="rounded-full shadow-sm"
                              >
                                {price.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-8">
                        <h4 className="text-sm font-semibold mb-4 text-foreground/80 uppercase tracking-wide">
                          Minimum Rating
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {[4.0, 4.5, 4.8].map(function (rating) {
                            return (
                              <Button
                                key={rating}
                                variant={
                                  minRating === rating ? "default" : "outline"
                                }
                                size="sm"
                                className="gap-1.5 rounded-full shadow-sm"
                                onClick={function () {
                                  setMinRating(
                                    minRating === rating ? null : rating,
                                  );
                                }}
                              >
                                <Star
                                  className={`h-3.5 w-3.5 ${minRating === rating ? "fill-primary-foreground" : "fill-yellow-400 text-yellow-400"}`}
                                />
                                {rating}+
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-8 pb-4">
                        <h4 className="text-sm font-semibold mb-4 text-foreground/80 uppercase tracking-wide">
                          Availability
                        </h4>
                        <div className="flex items-center space-x-3 group bg-muted/30 p-3 rounded-xl border border-border/50">
                          <Checkbox
                            id="mob-open-now"
                            checked={openNow}
                            onCheckedChange={function (checked) {
                              setOpenNow(!!checked);
                            }}
                            className="h-5 w-5 rounded-md border-border"
                          />
                          <Label
                            htmlFor="mob-open-now"
                            className="cursor-pointer text-base font-medium flex items-center gap-2"
                          >
                            <Clock className="h-4 w-4 text-primary" />
                            Open Now
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 group bg-muted/30 p-3 rounded-xl border border-border/50 mt-3">
                          <Checkbox
                            id="mob-fulfillment-physical"
                            checked={isPhysical}
                            onCheckedChange={function (checked) {
                              setIsPhysical(!!checked);
                            }}
                            className="h-5 w-5 rounded-md border-border"
                          />
                          <Label
                            htmlFor="mob-fulfillment-physical"
                            className="cursor-pointer text-base font-medium flex items-center gap-2"
                          >
                            <Store className="h-4 w-4 text-primary" />
                            At Salon (Physical)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 group bg-muted/30 p-3 rounded-xl border border-border/50 mt-3">
                          <Checkbox
                            id="mob-fulfillment-mobile"
                            checked={isMobile}
                            onCheckedChange={function (checked) {
                              setIsMobile(!!checked);
                            }}
                            className="h-5 w-5 rounded-md border-border"
                          />
                          <Label
                            htmlFor="mob-fulfillment-mobile"
                            className="cursor-pointer text-base font-medium flex items-center gap-2"
                          >
                            <Car className="h-4 w-4 text-orange-500" />
                            Travel to Me (Mobile)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 group bg-muted/30 p-3 rounded-xl border border-border/50 mt-3">
                          <Checkbox
                            id="mob-fulfillment-virtual"
                            checked={isVirtual}
                            onCheckedChange={function (checked) {
                              setIsVirtual(!!checked);
                            }}
                            className="h-5 w-5 rounded-md border-border"
                          />
                          <Label
                            htmlFor="mob-fulfillment-virtual"
                            className="cursor-pointer text-base font-medium flex items-center gap-2"
                          >
                            <Monitor className="h-4 w-4 text-violet-500" />
                            Virtual Session
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-border/50 bg-background/80 backdrop-blur-sm sticky bottom-0">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full h-12 rounded-xl text-base font-medium shadow-sm hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex-1" />

                {/* Map Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hidden lg:flex"
                  onClick={() => setShowMap(!showMap)}
                >
                  {showMap ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <MapIcon className="h-4 w-4" />
                  )}
                  {showMap ? "Hide Map" : "Show Map"}
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
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 rounded-r-none"
                    onClick={function () {
                      setViewMode("grid");
                    }}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 rounded-l-none"
                    onClick={function () {
                      setViewMode("list");
                    }}
                  >
                    <ListIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    Active filters:
                  </span>
                  {selectedCategories.map(function (catLabel) {
                    var cat = BUSINESS_CATEGORIES.find(function (c) {
                      return c.label === catLabel;
                    });
                    return (
                      <Badge
                        key={catLabel}
                        variant="secondary"
                        className="gap-1"
                      >
                        {cat?.label || catLabel}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={function () {
                            toggleCategory(catLabel);
                          }}
                        />
                      </Badge>
                    );
                  })}
                  {openNow && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 py-1 px-3 bg-card border border-border shadow-sm text-sm"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Open Now
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-muted/80 rounded-full"
                        onClick={function () {
                          setOpenNow(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {isPhysical && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 py-1 px-3 bg-card border border-border shadow-sm text-sm"
                    >
                      <Store className="h-3.5 w-3.5" />
                      At Salon
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-muted/80 rounded-full"
                        onClick={function () {
                          setIsPhysical(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {isMobile && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 py-1 px-3 bg-card border border-border shadow-sm text-sm"
                    >
                      <Car className="h-3.5 w-3.5" />
                      Travel to Me
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-muted/80 rounded-full"
                        onClick={function () {
                          setIsMobile(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {isVirtual && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 py-1 px-3 bg-card border border-border shadow-sm text-sm"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Virtual Session
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-muted/80 rounded-full"
                        onClick={function () {
                          setIsVirtual(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-muted-foreground transition-opacity">
                {loading
                  ? "Searching..."
                  : isMapLoading
                    ? "Updating map..."
                    : salons.length + " salons found"}
              </p>
            </div>

            {loading ? (
              <div className={`grid ${gridCols} gap-6`}>
                {[1, 2, 3, 4, 5, 6].map(function (i) {
                  return viewMode === "grid" ? (
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
              <div className="space-y-6">
                {isMobile && !hasExactLocation && (
                  <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 flex items-start gap-3">
                    <Car className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-orange-800 dark:text-orange-300">Set your exact location to see providers that can reach you</h4>
                      <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1">We need to know exactly where you are to match you with mobile professionals in your area.</p>
                    </div>
                  </div>
                )}
                <div
                  className={`transition-opacity duration-200 ${isMapLoading ? "opacity-50" : "opacity-100"} ${viewMode === "grid" ? `grid ${gridCols} gap-6` : "space-y-4"}`}
                >
                {salons.map(function (salon) {
                  return viewMode === "grid" ? (
                    <SalonCardGrid
                      key={salon.id}
                      salon={salon}
                      onMouseEnter={() => setHoveredSalonId(salon.id)}
                      onMouseLeave={() => setHoveredSalonId(null)}
                      onCardClick={handleCardClick}
                    />
                  ) : (
                    <SalonCardList
                      key={salon.id}
                      salon={salon}
                      onMouseEnter={() => setHoveredSalonId(salon.id)}
                      onMouseLeave={() => setHoveredSalonId(null)}
                      onCardClick={handleCardClick}
                    />
                  );
                })}
              </div>
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
          <div
            className={
              isMapExpanded
                ? "w-full h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden"
                : "hidden lg:block w-[480px] xl:w-[50%] shrink-0 sticky top-22 h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden"
            }
          >
            <SalonMap
              salons={salons}
              userLocation={
                userLocation.lat && userLocation.lng
                  ? {
                      lat: parseFloat(userLocation.lat),
                      lng: parseFloat(userLocation.lng),
                    }
                  : null
              }
              searchLocation={
                location && location !== "Map area"
                  ? { lat: null, lng: null }
                  : null
              } // Fallback to avoid fitting bounds if location isn't specific coords
              className="w-full h-full"
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              hoveredSalonId={hoveredSalonId}
              onBoundsChange={handleBoundsChange}
              isMapSearch={location === "Map area"}
            />
          </div>
        )}
      </div>

      <LocationModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
        onLocationSubmit={(address, lat, lng) => {
          sessionStorage.setItem(
            "fresh_mobile_service_location",
            JSON.stringify({ address, lat, lng, updatedAt: Date.now() })
          );
          setHasExactLocation(true);
          setShowLocationModal(false);
          if (pendingSalonForMobile) {
            router.push("/salon/" + generateSalonSlug(pendingSalonForMobile));
          }
        }}
      />
    </div>
  );
}

function SalonCardGrid({ salon, onMouseEnter, onMouseLeave, onCardClick }) {
  return (
    <SalonCard
      salon={salon}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onCardClick={onCardClick}
    />
  );
}

function SalonCardList({ salon, onMouseEnter, onMouseLeave, onCardClick }) {
  return (
    <Link
      href={"/salon/" + generateSalonSlug(salon)}
      onClick={(e) => {
        if (onCardClick) {
          e.preventDefault();
          onCardClick(salon);
        }
      }}
      className="block w-full"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
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
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {salon.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {salon.category || "Salon"}
                </p>
              </div>
              {salon.price_level && (
                <Badge variant="secondary">
                  {"$".repeat(salon.price_level)}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">
                {salon.rating?.toFixed(1) || "New"}
              </span>
              {salon.review_count > 0 && (
                <span className="text-muted-foreground">
                  ({salon.review_count} reviews)
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {salon.address || salon.city}
            </div>
            {salon.services_preview && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {salon.services_preview
                  .slice(0, 3)
                  .map(function (service, idx) {
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
