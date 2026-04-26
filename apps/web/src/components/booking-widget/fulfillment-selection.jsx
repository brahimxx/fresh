"use client";

import { MapPin, Monitor, Store, AlertCircle } from "lucide-react";
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

export function FulfillmentSelection({
  salon,
  fulfillmentType,
  onSelectType,
  clientAddress,
  onSelectAddress,
}) {
  // If salon only has one option, we should ideally skip this step, but for now we'll render it

  var isOutOfRange = false;
  if (
    fulfillmentType === "mobile" &&
    salon?.covered_zip_codes &&
    clientAddress.trim()
  ) {
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
      isOutOfRange = !hasMatch;
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Service Location
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          How would you like to receive your services?
        </p>
      </div>

      <RadioGroup
        value={fulfillmentType}
        onValueChange={onSelectType}
        className="grid grid-cols-1 gap-4"
      >
        {salon?.is_physical && (
          <label
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${fulfillmentType === "physical" ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-800"}`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
                <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
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

        {salon?.is_mobile && (
          <label
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${fulfillmentType === "mobile" ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-800"}`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/50">
                <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Mobile Service
                  </div>
                  <RadioGroupItem value="mobile" className="sr-only" />
                  {fulfillmentType === "mobile" && (
                    <div className="h-4 w-4 rounded-full border-4 border-blue-600"></div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  We travel to your location
                </div>
              </div>
            </div>

            {fulfillmentType === "mobile" && (
              <div className="mt-4 pl-14 pr-2">
                <Label
                  htmlFor="address"
                  className="mb-2 block text-sm font-medium"
                >
                  Your Address
                </Label>
                <Input
                  id="address"
                  placeholder="Enter your full address"
                  value={clientAddress || ""}
                  onChange={(e) => onSelectAddress(e.target.value)}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {isOutOfRange ? (
                    <span className="text-red-500 font-medium flex items-center mt-2">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Address is outside of our service area (Valid zones:{" "}
                      {salon.covered_zip_codes})
                    </span>
                  ) : (
                    salon.travel_fee_type !== "none" && (
                      <span className="mt-2 block">
                        Travel fee:{" "}
                        {salon.travel_fee_type === "fixed"
                          ? "Fixed price"
                          : "Per km/mile"}{" "}
                        ({salon.travel_fee_amount})
                      </span>
                    )
                  )}
                </p>
              </div>
            )}
          </label>
        )}

        {salon?.is_virtual && (
          <label
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${fulfillmentType === "virtual" ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-800"}`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/50">
                <Monitor className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
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
    </div>
  );
}
