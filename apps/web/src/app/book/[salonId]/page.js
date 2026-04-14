"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Calendar,
  Clock,
  User,
  Scissors,
  MapPin,
  Phone,
  Star,
  Loader2,
  Tag,
  X,
  CreditCard,
  Banknote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateSalonSlug } from "@/lib/utils";

// Import booking steps
import { ServiceSelection } from "@/components/booking-widget/service-selection";
import { FulfillmentSelection } from "@/components/booking-widget/fulfillment-selection";
import { DateTimeSelection } from "@/components/booking-widget/datetime-selection";
import { BookingAuth } from "@/components/booking-widget/booking-auth";
import { BookingConfirmation } from "@/components/booking-widget/booking-confirmation";
import { useAuth } from "@/providers/auth-provider";
import api from "@/lib/api-client";
import { formatDuration, formatCurrency } from "@/lib/format";

var STEPS = [
  { id: "services", label: "Services", icon: Scissors },
  { id: "location", label: "Location", icon: MapPin },
  { id: "datetime", label: "Date & Time", icon: Calendar },
  { id: "account", label: "Sign In", icon: User },
  { id: "confirm", label: "Confirm", icon: Check },
];

export default function BookingPage({ params }) {
  var resolvedParams = use(params);
  var salonId = resolvedParams.salonId;
  var searchParams = useSearchParams();

  var [salon, setSalon] = useState(null);
  var [loading, setLoading] = useState(true);
  var [errorMsg, setErrorMsg] = useState(null);
  var [currentStep, setCurrentStep] = useState(0);

  // Auth
  var { user, isAuthenticated } = useAuth();

  // Booking state - now services include staff assignments
  var [selectedServices, setSelectedServices] = useState([]); // Each service has: { ...service, staffId, staffName }
  var [fulfillmentType, setFulfillmentType] = useState("physical");
  var [clientAddress, setClientAddress] = useState("");
  var [selectedDate, setSelectedDate] = useState(null);
  var [selectedTime, setSelectedTime] = useState(null);
  var [bookingNotes, setBookingNotes] = useState("");
  var [paymentMethod, setPaymentMethod] = useState("cash");
  var [bookingComplete, setBookingComplete] = useState(false);
  var [bookingResult, setBookingResult] = useState(null);
  var [isBooking, setIsBooking] = useState(false);
  var [isVerifyingSlot, setIsVerifyingSlot] = useState(false);
  var [slotVerified, setSlotVerified] = useState(false);

  // Discount state
  var [discountInput, setDiscountInput] = useState("");
  var [appliedDiscount, setAppliedDiscount] = useState(null);
  var [discountError, setDiscountError] = useState("");
  var [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  // Check for cancelled checkout redirect
  useEffect(
    function () {
      if (searchParams.get("error") === "checkout_cancelled") {
        setErrorMsg("Your card payment was incomplete. Your booking slot has been released.");
      }
    },
    [searchParams]
  );

  // Load salon data
  useEffect(
    function () {
      async function loadSalon() {
        try {
          var res = await fetch("/api/widget/" + salonId);
          var data = await res.json();
          if (res.ok) {
            setSalon(data.data.salon);
            // We might need settings too later, but for now salon info is primary
          } else {
            setErrorMsg(data.error || "Failed to load salon");
          }
        } catch (error) {
          console.error("Failed to load salon:", error);
          setErrorMsg("Failed to connect to the booking service");
        } finally {
          setLoading(false);
        }
      }
      loadSalon();
    },
    [salonId]
  );

  // Warn user about unsaved changes
  useEffect(
    function () {
      function handleBeforeUnload(e) {
        if (selectedServices.length > 0 && !bookingComplete) {
          e.preventDefault();
          e.returnValue = '';
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload);
      return function () {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    },
    [selectedServices, bookingComplete]
  );

  // Verify slot availability when reaching confirmation step
  useEffect(
    function () {
      if (currentStep !== 3 || !selectedDate || !selectedTime || !selectedServices.length) {
        return;
      }

      async function verifySlot() {
        setIsVerifyingSlot(true);
        setSlotVerified(false);

        try {
          var year = selectedDate.getFullYear();
          var month = String(selectedDate.getMonth() + 1).padStart(2, '0');
          var day = String(selectedDate.getDate()).padStart(2, '0');
          var dateStr = year + '-' + month + '-' + day;

          var servicesParam = selectedServices
            .map(function (s) { return s.id + ':' + s.staffId; })
            .join(',');

          var res = await fetch(
            "/api/widget/" + salonId + "/availability?date=" + dateStr +
            "&services=" + encodeURIComponent(servicesParam)
          );

          if (res.ok) {
            var data = await res.json();
            var slots = data.data?.slots || [];
            var selectedStartTime = selectedTime;
            var isAvailable = slots.some(function (slot) {
              return slot.startTime === selectedStartTime;
            });

            setSlotVerified(isAvailable);

            if (!isAvailable) {
              setErrorMsg("This time slot is no longer available. Please select a different time.");
              setCurrentStep(1);
            }
          }
        } catch (error) {
          console.error("Slot verification failed:", error);
          // Allow proceeding on verification error
          setSlotVerified(true);
        } finally {
          setIsVerifyingSlot(false);
        }
      }

      verifySlot();
    },
    [currentStep, salonId, selectedDate, selectedTime, selectedServices]
  );

  // Calculate totals
  var totalDuration = (selectedServices && Array.isArray(selectedServices)) ? selectedServices.reduce(function (sum, s) {
    var duration = parseInt(s.duration) || 0;
    return sum + duration;
  }, 0) : 0;

  var totalPrice = (selectedServices && Array.isArray(selectedServices)) ? selectedServices.reduce(function (sum, s) {
    var price = parseFloat(s.price);
    return sum + (isNaN(price) ? 0 : price);
  }, 0) : 0;

  var travelFee = fulfillmentType === "mobile" && salon?.travel_fee_type !== "none" ? parseFloat(salon?.travel_fee_amount || 0) : 0;
  var discountAmount = appliedDiscount ? parseFloat(appliedDiscount.calculatedAmount || 0) : 0;
  var finalTotal = Math.max(0, (totalPrice + travelFee) - discountAmount);

  async function handleApplyDiscount() {
    if (!discountInput.trim()) return;
    setIsValidatingDiscount(true);
    setDiscountError("");
    try {
      var res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountInput.trim().toUpperCase(),
          salonId: salonId,
          subtotal: totalPrice,
          services: selectedServices.map(function(s) { return { id: s.id, price: s.price, quantity: 1 }; }),
          products: [],
        }),
      });
      var json = await res.json();
      if (res.ok && json.data?.valid) {
        setAppliedDiscount(json.data.discount);
        setDiscountInput("");
      } else {
        setDiscountError(json.error?.message || "Invalid or expired discount code.");
      }
    } catch (e) {
      setDiscountError("Could not validate discount. Please try again.");
    } finally {
      setIsValidatingDiscount(false);
    }
  }

  function handleRemoveDiscount() {
    setAppliedDiscount(null);
    setDiscountError("");
    setDiscountInput("");
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function canProceed() {
    switch (currentStep) {
      case 0:
        // All services must have staff assigned
        return selectedServices &&
          Array.isArray(selectedServices) &&
          selectedServices.length > 0 &&
          selectedServices.every(function (s) { return s.staffId; });
      case 1:
        return selectedDate && selectedTime;
      case 2:
        return isAuthenticated; // Must be logged in
      default:
        return true;
    }
  }

  async function handleConfirmBooking() {
    if (!isAuthenticated || !user) {
      setErrorMsg("Please sign in to complete your booking.");
      return;
    }

    setIsBooking(true);
    setErrorMsg(null);

    try {
      // Parse the selected time to get startTime
      var startTime = selectedTime; // Set slot start time

      // Get token for authenticated request
      var token = api.getToken();

      // Prepare services with staff assignments
      var servicesWithStaff = selectedServices.map(function (service) {
        return {
          serviceId: service.id,
          staffId: service.staffId,
          price: service.price,
          duration: service.duration
        };
      });

      var res = await fetch("/api/widget/" + salonId + "/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? "Bearer " + token : "",
        },
        body: JSON.stringify({
          services: servicesWithStaff,
          startTime: startTime,
          notes: bookingNotes,
          paymentMethod: paymentMethod,
          clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          fulfillmentType: fulfillmentType,
          serviceLocationAddress: fulfillmentType === "mobile" ? clientAddress : undefined,
          discountCode: appliedDiscount ? appliedDiscount.code : undefined,
        }),
      });

      if (res.ok) {
        var result = await res.json();
        if (paymentMethod === "stripe" && result.data?.checkoutUrl) {
          window.location.href = result.data.checkoutUrl;
          return;
        }
        setBookingResult(result.data);
        setBookingComplete(true);
      } else {
        var errorData = await res.json();
        var errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : (errorData.error?.message || "Unable to complete booking");
        
        var errorCode = errorData.error?.code;

        if (errorCode === "CLIENT_BLACKLISTED") {
          setErrorMsg(errorMessage);
          return; // Stop here, do not go back to step 1
        } else if (errorMessage.includes("not available")) {
          setErrorMsg("This time slot is no longer available. Please select a different time.");
        } else if (errorMessage.includes("conflict")) {
          setErrorMsg("There's a scheduling conflict. Please choose a different time slot.");
        } else {
          setErrorMsg(errorMessage + ". Please try again or contact the salon.");
        }
        // Go back to datetime selection
        setCurrentStep(1);
      }
    } catch (error) {
      console.error("Booking failed:", error);
      setErrorMsg("Network error. Please check your connection and try again.");
      setCurrentStep(1);
    } finally {
      setIsBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (errorMsg || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">
                {errorMsg === "Salon not found" ? "Salon Not Found" : "Booking Unavailable"}
              </h2>
              <p className="text-muted-foreground">
                {errorMsg === "Salon not found"
                  ? "We couldn't find this salon. It may have been removed or the link is incorrect."
                  : errorMsg || "This booking page is temporarily unavailable. Please try again later."}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl min-h-[44px]"
              onClick={() => window.location.href = '/'}
            >
              Back to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <BookingConfirmation
            salon={salon}
            booking={bookingResult}
            selectedServices={selectedServices}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            user={user}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header and Progress Wrap (Sticky) */}
      <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={'/salon/' + (salon ? generateSalonSlug(salon) : salonId)}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                {salon.logo ? (
                  <img
                    src={salon.logo}
                    alt={salon.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {salon.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">{salon.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {salon.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {salon.rating}
                      </span>
                    )}
                    {salon.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {salon.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </header>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {STEPS.map(function (step, index) {
              var isActive = index === currentStep;
              var isCompleted = index < currentStep;
              var Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={function() {
                      if (isCompleted) {
                        setCurrentStep(index);
                      }
                    }}
                    disabled={!isCompleted}
                    className={"flex items-center outline-none group " + (isCompleted ? "cursor-pointer" : "")}
                  >
                    <div
                      className={
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 " +
                        (isCompleted ? "group-hover:opacity-80 group-hover:scale-[1.05] " : "") +
                        (isCompleted
                          ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={
                      "hidden sm:block ml-2 text-sm " +
                      (isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground")
                    }
                  >
                    {step.label}
                  </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div
                      className={
                        "hidden sm:block w-12 h-0.5 mx-2 " +
                        (isCompleted ? "bg-primary" : "bg-muted")
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="text-destructive font-bold text-xs">!</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="flex-shrink-0 text-destructive/70 hover:text-destructive"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Step Content */}
          <div className="lg:col-span-2 transition-all duration-300 ease-in-out">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {currentStep === 0 && (
            <ServiceSelection
              salonId={salonId}
              selected={selectedServices}
              onSelect={setSelectedServices}
              currency={salon?.country || "US"}
            />
          )}

          {currentStep === 1 && salon && (
            <FulfillmentSelection
              salon={salon}
              fulfillmentType={fulfillmentType}
              onSelectType={setFulfillmentType}
              clientAddress={clientAddress}
              onSelectAddress={setClientAddress}
            />
          )}

              {currentStep === 4 && (
                <DateTimeSelection
                  salonId={salonId}
                  selectedServices={selectedServices}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateSelect={setSelectedDate}
                  onTimeSelect={setSelectedTime}
                />
              )}

              {currentStep === 4 && (
                <BookingAuth
                  onAuthenticated={function () {
                    /* User just logged in, can proceed */
                  }}
                />
              )}

              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your Booking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isVerifyingSlot && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">Verifying availability...</span>
                      </div>
                    )}

                    {!isVerifyingSlot && slotVerified && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-300">Time slot confirmed available</span>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Services</h4>
                      {selectedServices.map(function (service) {
                        return (
                          <div
                            key={service.id}
                            className="py-2 border-b last:border-0"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">{service.name}</span>
                              <span>{formatCurrency(service.price || 0, salon?.currency)}</span>
                            </div>
                            {service.staffName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                with {service.staffName}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Date & Time</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate && selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {selectedTime && new Date(selectedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>

                    {user && (
                      <div>
                        <h4 className="font-medium mb-1">Contact</h4>
                        <p className="text-sm text-muted-foreground">
                          {user.firstName || user.first_name}{" "}
                          {user.lastName || user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Discount Code */}
                    <div className="space-y-2 pt-2 border-t">
                      <label className="font-medium text-sm flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Discount Code
                      </label>
                      {appliedDiscount ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                          <div>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{appliedDiscount.code}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {appliedDiscount.type === 'percentage'
                                ? appliedDiscount.value + '% off'
                                : formatCurrency(appliedDiscount.value, salon?.currency) + ' off'}
                              {' — saving ' + formatCurrency(discountAmount, salon?.currency)}
                            </p>
                          </div>
                          <button onClick={handleRemoveDiscount} className="text-emerald-500 hover:text-emerald-700">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            className="flex-1 px-3 py-2 border rounded-md text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter code"
                            value={discountInput}
                            onChange={function(e) {
                              setDiscountInput(e.target.value.toUpperCase());
                              setDiscountError("");
                            }}
                            onKeyDown={function(e) { if (e.key === 'Enter') handleApplyDiscount(); }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleApplyDiscount}
                            disabled={!discountInput.trim() || isValidatingDiscount}
                          >
                            {isValidatingDiscount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                          </Button>
                        </div>
                      )}
                      {discountError && (
                        <p className="text-xs text-destructive">{discountError}</p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-4 pt-2 border-t">
                      <label className="font-medium text-sm">
                        Payment Method
                      </label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-3">
                        <div className={`flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors ${paymentMethod === 'stripe' ? 'bg-primary/5 border-primary' : 'hover:bg-muted'}`} onClick={() => setPaymentMethod('stripe')}>
                          <RadioGroupItem value="stripe" id="pay-stripe" />
                          <label htmlFor="pay-stripe" className="flex flex-1 items-center gap-2 cursor-pointer">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">Pay with Card</span>
                              <span className="text-xs text-muted-foreground">Secure payment via Stripe</span>
                            </div>
                          </label>
                        </div>
                        <div className={`flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors ${paymentMethod === 'cash' ? 'bg-primary/5 border-primary' : 'hover:bg-muted'}`} onClick={() => setPaymentMethod('cash')}>
                          <RadioGroupItem value="cash" id="pay-cash" />
                          <label htmlFor="pay-cash" className="flex flex-1 items-center gap-2 cursor-pointer">
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">Pay at Salon</span>
                              <span className="text-xs text-muted-foreground">Cash or card after your appointment</span>
                            </div>
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Optional notes */}
                    <div className="space-y-2 pt-2 border-t mt-4">
                      <label
                        htmlFor="booking-notes"
                        className="font-medium text-sm"
                      >
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        id="booking-notes"
                        className="w-full min-h-[80px] p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Any special requests or information?"
                        value={bookingNotes}
                        onChange={function (e) {
                          setBookingNotes(e.target.value);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-40">
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedServices.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {selectedServices.map(function (service) {
                        return (
                          <div
                            key={service.id}
                            className="flex justify-between text-sm"
                          >
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-muted-foreground">
                                {formatDuration(service.duration)}
                              </p>
                            </div>
                            <p className="font-medium">
                              {formatCurrency(service.price || 0, salon?.currency)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t pt-4 space-y-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Duration</span>
                        <span>{formatDuration(totalDuration)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totalPrice, salon?.currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-emerald-600">
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {appliedDiscount.code}
                            </span>
                            <span>-{formatCurrency(discountAmount, salon?.currency)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total</span>
                        <span>{formatCurrency(finalTotal, salon?.currency)}</span>
                      </div>
                    </div>

                    {selectedDate && selectedTime && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(selectedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select services to see summary
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="min-h-[44px] transition-all"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="min-h-[44px] transition-all"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleConfirmBooking}
              disabled={!canProceed() || isBooking || isVerifyingSlot || (currentStep === 3 && !slotVerified)}
              className="min-h-[44px] transition-all"
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : isVerifyingSlot ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
