import Link from "next/link";
import { useState } from "react";
import { 
  Share2, 
  Heart, 
  MapPin, 
  Star, 
  Calendar, 
  Phone, 
  Clock,
  Grid3X3,
  ArrowLeft,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogClose
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function SalonHero({ salon, servicesCount = 0 }) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "carousel"
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const galleryImages =
    salon?.gallery?.length > 0
      ? salon.gallery.map((g) => g.image_url)
      : salon?.cover_image_url
      ? [salon.cover_image_url]
      : [];

  const getStatus = (hours) => {
    if (salon?.is_closed_today) {
      return { label: "Closed Today", color: "bg-red-500" };
    }
    if (!hours || hours.length === 0)
      return { label: "Closed", color: "bg-red-500" };
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentDay = hours.find((h) => h.day_of_week === dayOfWeek);

    if (!currentDay || currentDay.is_closed)
      return { label: "Closed", color: "bg-red-500" };

    const nowTotal = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
      if (!t) return 0;
      const parts = t.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    const openTotal = parseTime(currentDay.open_time);
    const closeTotal = parseTime(currentDay.close_time);

    if (nowTotal >= openTotal && nowTotal < closeTotal) {
      return { label: "Open", color: "bg-green-500 hover:bg-green-600" };
    }
    return { label: "Closed", color: "bg-red-500" };
  };

  const status = getStatus(salon?.business_hours);

  const openGallery = (mode = "grid", index = 0) => {
    setViewMode(mode);
    setCarouselStartIndex(index);
    setIsGalleryOpen(true);
  };

  const renderInlineGallery = () => {
    if (galleryImages.length === 0) return null;
    
    if (galleryImages.length === 1) {
      return (
        <div 
          className="mt-10 rounded-[2rem] overflow-hidden cursor-pointer h-[300px] sm:h-[400px] w-full relative group shadow-sm border border-border"
          onClick={() => openGallery("carousel", 0)}
        >
           <img 
              src={galleryImages[0]} 
              alt={salon.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
            />
        </div>
      );
    }
  
    // Layout for 2+ images: First image large, next 3 small.
    const displayCount = Math.min(galleryImages.length, 4);
    const remainingCount = galleryImages.length - displayCount;
  
    return (
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 h-[300px] sm:h-[400px]">
        {galleryImages.slice(0, displayCount).map((img, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === displayCount - 1;
          const hasMore = remainingCount > 0;
          return (
            <div 
              key={idx} 
              className={`relative rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-border bg-muted ${
                isFirst ? "col-span-2 row-span-2 md:col-span-2" : "col-span-1 row-span-1"
              }`}
              onClick={() => {
                if (isLast && hasMore) openGallery("grid", 0);
                else openGallery("carousel", idx);
              }}
            >
              <img 
                src={img} 
                alt={`${salon.name} photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              {isLast && hasMore && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold group-hover:bg-black/50 transition-colors">
                    <Grid3X3 className="w-8 h-8 mb-2" />
                    <span className="text-lg">+{remainingCount} Photos</span>
                 </div>
              )}
            </div>
          )
        })}
      </div>
    )
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-8 md:pt-12">
        {/* Modern Header Info Grid */}
        <div className="flex flex-col md:flex-row items-start md:items-start gap-8 relative z-20">
          {/* Premium Logo Presentation */}
          <div className="shrink-0 relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] overflow-hidden shadow-xl bg-muted border border-border">
              {salon.logo_url ? (
                <img
                  src={salon.logo_url}
                  alt={salon.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold uppercase">
                  {salon.name.charAt(0)}
                </div>
              )}
            </div>
            {salon.business_hours && (
              <Badge
                className={`absolute -bottom-3 -right-3 px-3 py-1 shadow-md border-2 border-background text-white ${status.color}`}
              >
                {status.label}
              </Badge>
            )}
          </div>

          <div className="flex-1 text-left w-full">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
                  {salon.name}
                </h1>
                
                <div className="flex flex-wrap items-center justify-start gap-3 text-muted-foreground font-medium">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                    {salon.category || "Beauty & Wellness"}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm md:text-base">
                    <MapPin className="h-4 w-4 text-primary" />
                    {salon.city}
                    {salon.state ? ", " + salon.state : ""}
                  </span>
                  {salon.price_level && (
                    <span className="text-primary font-bold tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">
                      {Array(salon.price_level || 2)
                        .fill("$")
                        .join("")}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-start gap-6 pt-2">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 stroke-yellow-400" />
                      <span className="text-xl font-bold text-foreground">
                        {salon.rating?.toFixed(1) || "New"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      {salon.review_count || 0} Reviews
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex flex-col items-start">
                    <span className="text-xl font-bold text-foreground">
                      {servicesCount}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Services
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start mt-2 lg:mt-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-sm hover:bg-muted transition-all h-12 w-12"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-sm hover:bg-muted transition-all h-12 w-12"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Gallery Grid */}
        {renderInlineGallery()}

        {/* Action Bar for Mobile */}
        <div className="flex flex-col sm:hidden gap-3 mt-8">
          <Link href={`/book/${salon.id}`} className="w-full">
            <Button
              size="lg"
              className="w-full gap-2 shadow-lg shadow-primary/20 bg-primary text-primary-foreground font-bold text-lg h-14 rounded-2xl"
            >
              <Calendar className="h-5 w-5" />
              Book Appointment
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl">
              <Clock className="h-4 w-4" />
              Hours
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery Dialog Overlay */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className={`max-w-6xl w-full p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-none shadow-2xl transition-all duration-300 ${viewMode === 'carousel' ? 'h-[100dvh] sm:h-[90vh]' : 'h-[90vh]'}`}>
          <DialogTitle className="sr-only">Salon Gallery</DialogTitle>
          
          {viewMode === "grid" ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black">{salon.name} Gallery</h2>
                  <Badge variant="secondary" className="font-bold">{galleryImages.length} Photos</Badge>
                </div>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                    <X className="h-6 w-6" />
                  </Button>
                </DialogClose>
              </div>
              
              {/* Masonry Grid */}
              <div className="p-4 md:p-6 overflow-y-auto no-scrollbar">
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                  {galleryImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="relative rounded-xl overflow-hidden cursor-pointer group break-inside-avoid shadow-sm bg-muted"
                      onClick={() => {
                        setCarouselStartIndex(idx);
                        setViewMode("carousel");
                      }}
                    >
                      <img 
                        src={img} 
                        alt={`Gallery ${idx + 1}`} 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-black">
              {/* Top Controls Overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode("grid")}
                  className="text-white hover:bg-white/20 hover:text-white rounded-full gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline font-semibold">Back to Grid</span>
                </Button>
                
                <div className="text-white font-bold text-sm tracking-widest opacity-80">
                  {salon.name}
                </div>

                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                    <X className="h-6 w-6" />
                  </Button>
                </DialogClose>
              </div>

              {/* Lightbox Carousel */}
              <div className="flex-1 w-full h-full flex items-center justify-center relative">
                <Carousel 
                  opts={{ startIndex: carouselStartIndex, loop: true }}
                  className="w-full h-full"
                >
                  <CarouselContent className="h-full ml-0">
                    {galleryImages.map((img, idx) => (
                      <CarouselItem key={idx} className="w-full h-full flex items-center justify-center pl-0">
                        <div className="relative w-full h-full p-4 md:p-12 flex items-center justify-center">
                          <img 
                            src={img} 
                            alt={`Gallery ${idx + 1}`} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md h-12 w-12" />
                  <CarouselNext className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md h-12 w-12" />
                </Carousel>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
