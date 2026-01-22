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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Import booking steps
import { ServiceSelection } from "@/components/booking-widget/service-selection";
import { DateTimeSelection } from "@/components/booking-widget/datetime-selection";
import { BookingAuth } from "@/components/booking-widget/booking-auth";
import { BookingConfirmation } from "@/components/booking-widget/booking-confirmation";
import { useAuth } from "@/providers/auth-provider";

var STEPS = [
  { id: "services", label: "Services", icon: Scissors },
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
  var [selectedDate, setSelectedDate] = useState(null);
  var [selectedTime, setSelectedTime] = useState(null);
  var [bookingNotes, setBookingNotes] = useState("");
  var [bookingComplete, setBookingComplete] = useState(false);
  var [bookingResult, setBookingResult] = useState(null);

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

  // Calculate totals
  var totalDuration = (selectedServices && Array.isArray(selectedServices)) ? selectedServices.reduce(function (sum, s) {
    return sum + (s.duration || 0);
  }, 0) : 0;

  var totalPrice = (selectedServices && Array.isArray(selectedServices)) ? selectedServices.reduce(function (sum, s) {
    return sum + parseFloat(s.price || 0);
  }, 0) : 0;

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
               selectedServices.every(function(s) { return s.staffId; });
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

    try {
      // Parse the selected time to get startTime
      var startTime = selectedTime.split("-")[0]; // Remove any suffix if present

      // Get token for authenticated request
      var token = localStorage.getItem("auth_token");

      // Prepare services with staff assignments
      var servicesWithStaff = selectedServices.map(function(service) {
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
        }),
      });

      if (res.ok) {
        var result = await res.json();
        setBookingResult(result.data);
        setBookingComplete(true);
      } else {
        var errorData = await res.json();
        // Handle both string and object error formats
        var errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.error?.message || "Unable to complete booking");
        
        if (errorMessage.includes("not available")) {
          setErrorMsg("This time slot is no longer available. Please select a different time.");
        } else if (errorMessage.includes("conflict")) {
          setErrorMsg("There's a scheduling conflict. Please choose a different time slot.");
        } else {
          setErrorMsg(errorMessage + ". Please try again or contact the salon.");
        }
        // Go back to datetime selection
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Booking failed:", error);
      setErrorMsg("Network error. Please check your connection and try again.");
      setCurrentStep(2);
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
            selectedStaff={selectedStaff}
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
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={'/salon/' + salonId}>
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
      <div className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {STEPS.map(function (step, index) {
              var isActive = index === currentStep;
              var isCompleted = index < currentStep;
              var Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors " +
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
        {errorMsg && currentStep !== 0 && (
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
              />
            )}

            {currentStep === 1 && (
              <DateTimeSelection
                salonId={salonId}
                selectedServices={selectedServices}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateSelect={setSelectedDate}
                onTimeSelect={setSelectedTime}
              />
            )}

            {currentStep === 2 && (
              <BookingAuth
                onAuthenticated={function () {
                  /* User just logged in, can proceed */
                }}
              />
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Booking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            <span>${parseFloat(service.price).toFixed(2)}</span>
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
                      {selectedDate && selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {selectedTime && new Date(selectedTime.split('-')[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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

                  {/* Optional notes */}
                  <div className="space-y-2 pt-2 border-t">
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
            <Card className="sticky top-32">
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
                                {service.duration} min
                              </p>
                            </div>
                            <p className="font-medium">
                              ${parseFloat(service.price).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Duration</span>
                        <span>{totalDuration} min</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${totalPrice.toFixed(2)}</span>
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
                          <span>{new Date(selectedTime.split('-')[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
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
              disabled={!canProceed()}
              className="min-h-[44px] transition-all"
            >
              Confirm Booking
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
