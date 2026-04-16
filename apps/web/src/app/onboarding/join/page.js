"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Loader2, Store, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function JoinBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [viewingSalon, setViewingSalon] = useState(null);

  useEffect(() => {
    async function searchBusiness() {
      if (!debouncedSearch.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.get(
          `/marketplace/salons?q=${encodeURIComponent(debouncedSearch)}`,
        );
        setResults(response?.data || response?.data?.data || []);
      } catch (error) {
        console.error("Failed to search businesses:", error);
      } finally {
        setIsLoading(false);
      }
    }
    searchBusiness();
  }, [debouncedSearch]);

  const handleViewProfile = (salon) => {
    setViewingSalon(salon);
    setProfileModalOpen(true);
  };

  const handleSelectBusiness = (salon) => {
    setSelectedSalon(salon);
    setStep(2);
    setProfileModalOpen(false);
  };

  const handleRadioSelect = (salon) => {
    setSelectedSalon(salon);
  };

  const originalHandleSelect = (salon) => {
    setSelectedSalon(salon);
    setStep(2);
  };

  const handleSendRequest = async () => {
    if (!selectedSalon) return;
    setIsSubmitting(true);
    try {
      await api.post(`/staff/request-join`, {
        salonId: selectedSalon.id,
        message: message.trim(),
      });
      toast.success("Request sent successfully!", {
        description: "The business owner will review your request.",
      });
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Failed to send request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header & Progress Bar */}
      <header className="sticky top-0 z-50 bg-background border-b mb-12">
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "50%" }}
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex h-16 items-center px-4 max-w-4xl mx-auto w-full justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              step === 2 ? setStep(1) : router.push("/onboarding/choose")
            }
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/onboarding/choose">Close</Link>
            </Button>
            {step === 1 ? (
              <Button
                variant={selectedSalon ? "default" : "secondary"}
                className={
                  selectedSalon
                    ? "rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
                    : "rounded-full"
                }
                disabled={!selectedSalon}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="rounded-full bg-primary text-primary-foreground font-semibold"
                onClick={handleSendRequest}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Send request
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  Search for a business
                </h1>
                <p className="text-muted-foreground">
                  Find a business on Fresh to request login access to their
                  workspace
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-10 h-14 bg-card border-muted-foreground/20 rounded-xl focus-visible:ring-primary text-lg"
                  placeholder="Search by business name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((salon) => (
                      <div
                        key={salon.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${selectedSalon?.id === salon.id ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-card hover:bg-accent/5"} transition-colors cursor-pointer`}
                        onClick={() => handleRadioSelect(salon)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-muted-foreground/10">
                            {salon.logo_url ? (
                              <img
                                src={salon.logo_url}
                                alt={salon.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl font-bold text-primary">
                                {salon.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {salon.name}
                            </h3>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {salon.address
                                ? `${salon.address}${salon.city ? `, ${salon.city}` : ""}`
                                : salon.city || "Location not provided"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-full shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(salon);
                          }}
                        >
                          View profile
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : searchTerm.trim() ? (
                  <div className="text-center p-12 border border-dashed rounded-xl border-muted-foreground/20">
                    <Store className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <p className="text-muted-foreground">
                      No businesses found matching &quot;{searchTerm}&quot;
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}

          {step === 2 && selectedSalon && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  Send a request to join {selectedSalon.name}
                </h1>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm px-1 text-muted-foreground">
                  <label
                    htmlFor="message"
                    className="font-medium text-foreground"
                  >
                    Add a message (Optional)
                  </label>
                  <span>{message.length}/100</span>
                </div>
                <Textarea
                  id="message"
                  autoFocus
                  placeholder=""
                  className="min-h-[140px] resize-none bg-card border-muted-foreground/20 rounded-xl focus-visible:ring-primary text-base p-4"
                  value={message}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) {
                      setMessage(e.target.value);
                    }
                  }}
                  maxLength={100}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-sm bg-card text-card-foreground border-border/50 rounded-[2rem] overflow-hidden p-0 gap-0 shadow-2xl">
            <div className="sr-only">
              <DialogTitle>{viewingSalon?.name}&apos;s locations</DialogTitle>
            </div>
            {viewingSalon && (
              <>
                {/* Header/Cover Area */}
                <div className="h-32 min-h-[8rem] w-full bg-muted relative shrink-0">
                  {viewingSalon.cover_image_url ||
                  (viewingSalon.gallery && viewingSalon.gallery.length > 0) ? (
                    <img
                      src={
                        viewingSalon.cover_image_url ||
                        (viewingSalon.gallery &&
                          viewingSalon.gallery[0]?.image_url)
                      }
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : viewingSalon.logo_url ? (
                    <img
                      src={viewingSalon.logo_url}
                      alt="Cover Fallback"
                      className="w-full h-full object-cover blur-sm opacity-50 scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>

                <div className="px-6 pb-6 relative -mt-16">
                  {/* Logo & Action */}
                  <div className="flex justify-between items-end mb-4">
                    <div className="w-24 h-24 rounded-2xl bg-secondary border-4 border-card flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10">
                      {viewingSalon.logo_url ? (
                        <img
                          src={viewingSalon.logo_url}
                          alt={viewingSalon.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-extrabold tracking-tight text-secondary-foreground">
                          {viewingSalon.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <Button
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-10 mb-2 transition-transform active:scale-95 shadow-lg relative z-10"
                      onClick={() => handleSelectBusiness(viewingSalon)}
                    >
                      Select Workspace
                    </Button>
                  </div>

                  {/* Info */}
                  <DialogHeader className="text-left mb-4 space-y-1">
                    <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                      {viewingSalon.name}
                    </DialogTitle>
                    <div className="flex items-center text-[15px] font-medium text-muted-foreground">
                      <span>{viewingSalon.category || "Salon and Spa"}</span>
                      <span className="mx-2 opacity-50">•</span>
                      <span className="flex items-center text-foreground">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 stroke-yellow-400 mr-1.5" />
                        <span>{viewingSalon.rating || "5.0"}</span>
                        <span className="text-muted-foreground ml-1">
                          ({viewingSalon.review_count || 0})
                        </span>
                      </span>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Address */}
                    <div className="flex items-start gap-4 text-muted-foreground">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="leading-relaxed pt-0.5">
                        <p className="font-medium text-foreground">
                          {viewingSalon.address || "Address not provided"}
                        </p>
                        {(viewingSalon.city ||
                          viewingSalon.state ||
                          viewingSalon.postal_code) && (
                          <p className="text-sm mt-0.5">
                            {[
                              viewingSalon.city,
                              viewingSalon.state,
                              viewingSalon.postal_code,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {viewingSalon.description && (
                      <div className="text-[15px] text-muted-foreground bg-secondary/50 p-5 rounded-2xl border border-border/50">
                        <p className="line-clamp-3 leading-relaxed">
                          {viewingSalon.description}
                        </p>
                      </div>
                    )}

                    {/* Services Pill Tags */}
                    {viewingSalon.services_preview &&
                      viewingSalon.services_preview.length > 0 && (
                        <div className="pt-2">
                          <h4 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                            Services
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {viewingSalon.services_preview.map((svc, i) => (
                              <span
                                key={i}
                                className="text-[14px] bg-secondary text-secondary-foreground px-4 py-2 rounded-xl font-medium shadow-sm"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
