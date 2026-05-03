"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Monitor,
  Store,
  AlertCircle,
  LocateFixed,
  Loader2,
  Home,
  Briefcase,
  Building,
  Heart,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

var ADDRESS_ICON_MAP = {
  Home: Home,
  Briefcase: Briefcase,
  Building: Building,
  Heart: Heart,
  Star: Star,
  MapPin: MapPin,
};

import { LocationModal } from "@/components/ui/location-modal";

export function FulfillmentSelection({
  salon,
  fulfillmentType,
  onSelectType,
  clientAddress,
  onSelectAddress,
  mobileLocationCoords,
  onSelectMobileLocation,
  supportedFulfillmentTypes,
}) {
  var [locationModalOpen, setLocationModalOpen] = useState(false);
  var [pendingAddress, setPendingAddress] = useState(clientAddress || "");
  var [pendingCoords, setPendingCoords] = useState(
    mobileLocationCoords || null,
  );

  var hasValidMobileLocation = !!(
    clientAddress &&
    clientAddress.trim() &&
    mobileLocationCoords &&
    Number.isFinite(Number(mobileLocationCoords.lat)) &&
    Number.isFinite(Number(mobileLocationCoords.lng))
  );

  useEffect(
    function () {
      setPendingAddress(clientAddress || "");
      setPendingCoords(mobileLocationCoords || null);
    },
    [clientAddress, mobileLocationCoords],
  );


  function commitMobileLocation(nextAddress, nextLat, nextLng) {
    var normalizedAddress = String(nextAddress || "").trim();
    var normalizedLat = Number(nextLat);
    var normalizedLng = Number(nextLng);
    if (
      !normalizedAddress ||
      !Number.isFinite(normalizedLat) ||
      !Number.isFinite(normalizedLng)
    ) {
      return;
    }

    onSelectAddress(normalizedAddress);
    if (typeof onSelectMobileLocation === "function") {
      onSelectMobileLocation({
        address: normalizedAddress,
        lat: normalizedLat,
        lng: normalizedLng,
      });
    }
    setLocationModalOpen(false);
    onSelectType("mobile");
  }

  function handleFulfillmentChange(nextType) {
    if (nextType !== "mobile") {
      onSelectType(nextType);
      return;
    }

    if (hasValidMobileLocation) {
      onSelectType("mobile");
      return;
    }

    // Keep current selection unchanged until a valid mobile location is provided.
    setPendingAddress(clientAddress || "");
    setPendingCoords(mobileLocationCoords || null);
    setLocationModalOpen(true);
  }

  // If salon only has one option, we should ideally skip this step, but for now we'll render it

  // Determine if a fulfillment type is blocked by the service selection
  function isUnsupportedByServices(type) {
    if (!supportedFulfillmentTypes) return false;
    return !supportedFulfillmentTypes.includes(type);
  }

  var isOutOfRange = false;
  function checkLocationOutOfRange() {
    if (!clientAddress && !mobileLocationCoords) return false;

    // Check zip codes
    if (salon?.covered_zip_codes && clientAddress) {
      var zips = salon.covered_zip_codes
        .split(",")
        .map(function (z) {
          return z.trim();
        })
        .filter(Boolean);
      if (zips.length > 0) {
        var hasMatch = zips.some(function (z) {
          return clientAddress.includes(z);
        });
        if (!hasMatch) return true;
      }
    }

    // Check radius
    var radiusKm = Number(salon?.travel_radius || 0);
    if (
      radiusKm > 0 &&
      mobileLocationCoords?.lat &&
      mobileLocationCoords?.lng &&
      salon?.latitude &&
      salon?.longitude
    ) {
      var R = 6371; // km
      var dLat = ((mobileLocationCoords.lat - salon.latitude) * Math.PI) / 180;
      var dLon = ((mobileLocationCoords.lng - salon.longitude) * Math.PI) / 180;
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((salon.latitude * Math.PI) / 180) *
          Math.cos((mobileLocationCoords.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var distance = R * c;

      if (distance > radiusKm) {
        return true;
      }
    }

    return false;
  }

  isOutOfRange = checkLocationOutOfRange();

  useEffect(
    function () {
      if (isOutOfRange && fulfillmentType === "mobile") {
        onSelectType(null);
      }
    },
    [isOutOfRange, fulfillmentType, onSelectType]
  );

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Service Type
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          How would you like to receive your services?
        </p>
        {supportedFulfillmentTypes && supportedFulfillmentTypes.length > 0 && (
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md inline-block">
            Showing options available for all selected services
          </p>
        )}
      </div>

      <RadioGroup
        value={fulfillmentType}
        onValueChange={handleFulfillmentChange}
        className="grid grid-cols-1 gap-4"
      >
        {salon?.is_physical === 1 && !isUnsupportedByServices("physical") && (
          <label
            className={`cursor-pointer block rounded-lg border-2 p-4 transition-all ${
              fulfillmentType === "physical"
                ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-800"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
                <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    At the Salon
                  </div>
                  <RadioGroupItem value="physical" className="sr-only" />
                  {fulfillmentType === "physical" && (
                    <div className="h-4 w-4 rounded-full border-4 border-blue-600"></div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Come into our location for your appointment
                </div>
              </div>
            </div>
          </label>
        )}

        {salon?.is_mobile === 1 && !isUnsupportedByServices("mobile") && (
          <label
            className={`block rounded-lg border-2 p-4 transition-all ${
              fulfillmentType === "mobile"
                ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                : isOutOfRange
                ? "border-gray-200 bg-gray-50 opacity-60 dark:bg-gray-900/50 dark:border-gray-800"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-800 cursor-pointer"
            }`}
          >
            <div
              className={`flex items-center gap-4 ${!isOutOfRange ? "cursor-pointer" : ""}`}
              onClick={function (e) {
                if (isOutOfRange) e.preventDefault();
              }}
            >
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/50">
                <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Mobile Service
                  </div>
                  <RadioGroupItem value="mobile" className="sr-only" disabled={isOutOfRange} />
                  {fulfillmentType === "mobile" && !isOutOfRange && (
                    <div className="h-4 w-4 rounded-full border-4 border-blue-600"></div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  We travel to your location
                </div>
              </div>
            </div>

            {isOutOfRange && (
              <div className="mt-4 pl-14 pr-2">
                <p className="text-sm text-red-500 font-medium flex items-start">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span>
                    Not available at your current location.
                    {salon.covered_zip_codes && ` (Valid zones: ${salon.covered_zip_codes})`}
                    {Number(salon.travel_radius) > 0 && ` (Max radius: ${salon.travel_radius} km)`}
                  </span>
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={function (e) {
                      e.preventDefault();
                      setPendingAddress(clientAddress || "");
                      setPendingCoords(mobileLocationCoords || null);
                      setLocationModalOpen(true);
                    }}
                  >
                    Change location
                  </Button>
                </div>
              </div>
            )}

            {fulfillmentType === "mobile" && !isOutOfRange && (
              <div className="mt-4 pl-14 pr-2">
                <Label htmlFor="address" className="mb-2 block text-sm font-medium">
                  Your Address
                </Label>
                <Input
                  id="address"
                  placeholder="Choose your service location"
                  value={clientAddress || ""}
                  readOnly
                  className="w-full"
                />
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={function () {
                      setPendingAddress(clientAddress || "");
                      setPendingCoords(mobileLocationCoords || null);
                      setLocationModalOpen(true);
                    }}
                  >
                    Update location
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Set or change your location using the button above.
                </p>
                {salon.travel_fee_type !== "none" && (
                  <p className="mt-2 text-xs text-muted-foreground block">
                    Travel fee:{" "}
                    {salon.travel_fee_type === "fixed" ? "Fixed price" : "Distance-based rate"}{" "}
                    ({salon.travel_fee_amount})
                  </p>
                )}
              </div>
            )}
          </label>
        )}

        {salon?.is_virtual === 1 && !isUnsupportedByServices("virtual") && (
          <label
            className={`cursor-pointer block rounded-lg border-2 p-4 transition-all ${
              fulfillmentType === "virtual"
                ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-800"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/50">
                <Monitor className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Virtual Appointment
                  </div>
                  <RadioGroupItem value="virtual" className="sr-only" />
                  {fulfillmentType === "virtual" && (
                    <div className="h-4 w-4 rounded-full border-4 border-blue-600"></div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Meet online via video link
                </div>
              </div>
            </div>
          </label>
        )}
      </RadioGroup>

      <LocationModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        initialAddress={pendingAddress}
        initialCoords={pendingCoords}
        onLocationSubmit={commitMobileLocation}
      />
    </div>
  );
}

