import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
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
  X,
  ChevronLeft,
  ChevronRight,
  Images,
  Camera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateSalonSlug } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function SalonHero({ salon, servicesCount = 0 }) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [activeIndex, setActiveIndex] = useState(0);

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

  const openGallery = useCallback((mode = "grid", index = 0) => {
    setViewMode(mode);
    setActiveIndex(index);
    setIsGalleryOpen(true);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isGalleryOpen || viewMode !== "carousel") return;
    const handler = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setIsGalleryOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isGalleryOpen, viewMode, goNext, goPrev]);

  // ─── Inline Gallery Layouts ──────────────────────────────────────────────
  const renderInlineGallery = () => {
    if (galleryImages.length === 0) return null;

    if (galleryImages.length === 1) {
      return (
        <div className="mt-8 md:mt-10">
          <div
            className="rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer h-[260px] sm:h-[360px] md:h-[420px] w-full relative group shadow-md"
            onClick={() => openGallery("carousel", 0)}
          >
            <img
              src={galleryImages[0]}
              alt={salon.name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <ShowAllButton count={1} onClick={() => openGallery("grid", 0)} />
          </div>
        </div>
      );
    }

    if (galleryImages.length === 2) {
      return (
        <div className="mt-8 md:mt-10 grid grid-cols-2 gap-2 md:gap-3 h-[260px] sm:h-[360px] md:h-[420px]">
          {galleryImages.slice(0, 2).map((img, idx) => (
            <GalleryCell
              key={idx}
              src={img}
              alt={`${salon.name} photo ${idx + 1}`}
              className={idx === 0 ? "rounded-l-2xl md:rounded-l-3xl" : "rounded-r-2xl md:rounded-r-3xl"}
              onClick={() => openGallery("carousel", idx)}
            />
          ))}
          <ShowAllButton count={2} onClick={() => openGallery("grid", 0)} />
        </div>
      );
    }

    if (galleryImages.length === 3) {
      return (
        <div className="mt-8 md:mt-10 grid grid-cols-4 grid-rows-2 gap-2 md:gap-3 h-[260px] sm:h-[360px] md:h-[420px]">
          <GalleryCell
            src={galleryImages[0]}
            alt={`${salon.name} photo 1`}
            className="col-span-2 row-span-2 rounded-l-2xl md:rounded-l-3xl"
            onClick={() => openGallery("carousel", 0)}
          />
          <GalleryCell
            src={galleryImages[1]}
            alt={`${salon.name} photo 2`}
            className="col-span-2 rounded-tr-2xl md:rounded-tr-3xl"
            onClick={() => openGallery("carousel", 1)}
          />
          <GalleryCell
            src={galleryImages[2]}
            alt={`${salon.name} photo 3`}
            className="col-span-2 rounded-br-2xl md:rounded-br-3xl"
            onClick={() => openGallery("carousel", 2)}
          />
          <ShowAllButton count={3} onClick={() => openGallery("grid", 0)} />
        </div>
      );
    }

    if (galleryImages.length === 4) {
      return (
        <div className="mt-8 md:mt-10 grid grid-cols-4 grid-rows-2 gap-2 md:gap-3 h-[260px] sm:h-[360px] md:h-[420px]">
          <GalleryCell
            src={galleryImages[0]}
            alt={`${salon.name} photo 1`}
            className="col-span-2 row-span-2 rounded-l-2xl md:rounded-l-3xl"
            onClick={() => openGallery("carousel", 0)}
          />
          <GalleryCell
            src={galleryImages[1]}
            alt={`${salon.name} photo 2`}
            className="col-span-1"
            onClick={() => openGallery("carousel", 1)}
          />
          <GalleryCell
            src={galleryImages[2]}
            alt={`${salon.name} photo 3`}
            className="col-span-1 rounded-tr-2xl md:rounded-tr-3xl"
            onClick={() => openGallery("carousel", 2)}
          />
          <GalleryCell
            src={galleryImages[3]}
            alt={`${salon.name} photo 4`}
            className="col-span-2 rounded-br-2xl md:rounded-br-3xl"
            onClick={() => openGallery("carousel", 3)}
          />
          <ShowAllButton count={4} onClick={() => openGallery("grid", 0)} />
        </div>
      );
    }

    // 5+ images — Airbnb-style bento grid
    const remaining = galleryImages.length - 5;
    return (
      <div className="mt-8 md:mt-10 grid grid-cols-4 grid-rows-2 gap-2 md:gap-3 h-[260px] sm:h-[360px] md:h-[420px]">
        {/* Hero image — large left */}
        <GalleryCell
          src={galleryImages[0]}
          alt={`${salon.name} photo 1`}
          className="col-span-2 row-span-2 rounded-l-2xl md:rounded-l-3xl"
          onClick={() => openGallery("carousel", 0)}
        />
        {/* Top-right pair */}
        <GalleryCell
          src={galleryImages[1]}
          alt={`${salon.name} photo 2`}
          className="col-span-1"
          onClick={() => openGallery("carousel", 1)}
        />
        <GalleryCell
          src={galleryImages[2]}
          alt={`${salon.name} photo 3`}
          className="col-span-1 rounded-tr-2xl md:rounded-tr-3xl"
          onClick={() => openGallery("carousel", 2)}
        />
        {/* Bottom-right pair */}
        <GalleryCell
          src={galleryImages[3]}
          alt={`${salon.name} photo 4`}
          className="col-span-1"
          onClick={() => openGallery("carousel", 3)}
        />
        <div
          className="col-span-1 relative overflow-hidden cursor-pointer group rounded-br-2xl md:rounded-br-3xl bg-muted"
          onClick={() => openGallery(remaining > 0 ? "grid" : "carousel", 4)}
        >
          <img
            src={galleryImages[4]}
            alt={`${salon.name} photo 5`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {remaining > 0 && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white group-hover:bg-black/40 transition-colors duration-300">
              <Grid3X3 className="w-6 h-6 mb-1.5 opacity-90" />
              <span className="text-sm font-bold">+{remaining}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>

        <ShowAllButton count={galleryImages.length} onClick={() => openGallery("grid", 0)} />
      </div>
    );
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
                  {galleryImages.length > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex flex-col items-start">
                        <span className="text-xl font-bold text-foreground">
                          {galleryImages.length}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Photos
                        </span>
                      </div>
                    </>
                  )}
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
          <Link href={`/book/${generateSalonSlug(salon)}`} className="w-full">
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

      {/* ─── Gallery Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent
          className={`max-w-6xl w-full p-0 gap-0 overflow-hidden bg-background border-none shadow-2xl transition-all duration-300 ${
            viewMode === "carousel"
              ? "h-[100dvh] sm:h-[95vh] bg-background"
              : "h-[90vh]"
          }`}
        >
          <DialogTitle className="sr-only">Salon Gallery</DialogTitle>

          {viewMode === "grid" ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">{salon.name}</h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {galleryImages.length} photo{galleryImages.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-muted h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogClose>
              </div>

              {/* Masonry Grid */}
              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden cursor-pointer group break-inside-avoid mb-3 md:mb-4 shadow-sm bg-muted"
                      onClick={() => {
                        setActiveIndex(idx);
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
                      {/* Index indicator */}
                      <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx + 1}/{galleryImages.length}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // ─── Lightbox Carousel ───
            <div className="flex flex-col h-full bg-background relative select-none">
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 md:p-5 flex items-center justify-between z-50 bg-gradient-to-b from-background/90 via-background/50 to-transparent">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="text-foreground hover:bg-foreground/10 hover:text-foreground rounded-full gap-2 h-10 px-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline font-semibold">All Photos</span>
                </Button>

                <div className="bg-foreground/10 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-sm font-bold tracking-wide border border-border/50">
                  {activeIndex + 1} / {galleryImages.length}
                </div>

                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground hover:bg-foreground/10 rounded-full h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogClose>
              </div>

              {/* Image area */}
              <div className="flex-1 flex items-center justify-center relative px-4 md:px-16">
                <img
                  key={activeIndex}
                  src={galleryImages[activeIndex]}
                  alt={`Gallery ${activeIndex + 1}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in fade-in duration-200"
                />

                {/* Nav arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-foreground/10 hover:bg-foreground/20 backdrop-blur-md text-foreground flex items-center justify-center transition-all hover:scale-110 border border-border/50"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-foreground/10 hover:bg-foreground/20 backdrop-blur-md text-foreground flex items-center justify-center transition-all hover:scale-110 border border-border/50"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Bottom thumbnails strip */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 via-background/50 to-transparent">
                  <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1 px-4">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`shrink-0 h-14 w-14 md:h-16 md:w-16 rounded-lg overflow-hidden transition-all duration-200 ${
                          idx === activeIndex
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 opacity-100"
                            : "opacity-50 hover:opacity-80 hover:scale-105"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumb ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Reusable Gallery Cell ─────────────────────────────────────────────────
function GalleryCell({ src, alt, className = "", onClick }) {
  return (
    <div
      className={`relative overflow-hidden cursor-pointer group bg-muted ${className}`}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </div>
  );
}

// ─── Show All Photos Button ────────────────────────────────────────────────
function ShowAllButton({ count, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-background/90 hover:bg-background backdrop-blur-md text-foreground text-sm font-bold px-4 py-2.5 rounded-xl border border-border shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
    >
      <Images className="h-4 w-4" />
      Show all {count} photos
    </button>
  );
}
