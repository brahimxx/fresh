"use client";

import { useState, useEffect } from "react";
import { MapPin, Save, Loader2, CheckCircle2, X, Navigation } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import api from "@/lib/api-client";

const MAPS_LIBRARIES = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "200px",
  borderRadius: "8px",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

export function StaffAddressesTab({ staffId, staff }) {
  var [selectedAddress, setSelectedAddress] = useState(null);
  var [saving, setSaving] = useState(false);
  var [message, setMessage] = useState(null);
  var [hasCoords, setHasCoords] = useState(false);
  var [currentCoords, setCurrentCoords] = useState(null);
  var queryClient = useQueryClient();

  var { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: MAPS_LIBRARIES,
  });

  useEffect(function () {
    if (staff) {
      var lat = staff.homeLat ?? staff.home_lat;
      var lng = staff.homeLng ?? staff.home_lng;
      if (lat != null && lng != null) {
        setHasCoords(true);
        setCurrentCoords({ lat: Number(lat), lng: Number(lng) });
      }
    }
  }, [staff]);

  function handleAddressChange(data) {
    if (data && data.lat && data.lng) {
      setSelectedAddress(data);
      setMessage(null);
    }
  }

  async function handleSave() {
    if (!selectedAddress || !selectedAddress.lat || !selectedAddress.lng) {
      setMessage({ type: "error", text: "Please select an address from the suggestions" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.put("/staff/" + staffId, {
        homeLat: selectedAddress.lat,
        homeLng: selectedAddress.lng,
      });

      setHasCoords(true);
      setCurrentCoords({ lat: selectedAddress.lat, lng: selectedAddress.lng });
      setSelectedAddress(null);
      setMessage({ type: "success", text: "Home address saved. Travel fees will be calculated from this location." });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      console.error("Save address error:", err);
      setMessage({ type: "error", text: "Failed to save address. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/staff/" + staffId, {
        homeLat: null,
        homeLng: null,
      });
      setHasCoords(false);
      setCurrentCoords(null);
      setMessage({ type: "success", text: "Home address cleared. Travel fees will use the salon address." });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      console.error("Clear address error:", err);
      setMessage({ type: "error", text: "Failed to clear address." });
    } finally {
      setSaving(false);
    }
  }

  var displayCoords = selectedAddress
    ? { lat: selectedAddress.lat, lng: selectedAddress.lng }
    : currentCoords;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Base Location
        </CardTitle>
        <CardDescription>
          Where does this staff member start their day? This is used to calculate travel fees and check if mobile appointments are feasible.
          If not set, the salon address is used instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        <div className="flex items-center gap-2">
          {hasCoords ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Location set
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Not set — using salon address for travel calculations</span>
            </div>
          )}
        </div>

        {/* Address autocomplete */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {hasCoords ? "Update address" : "Search for address"}
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <AddressAutocomplete
                value=""
                onChange={handleAddressChange}
                placeholder="Start typing an address..."
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedAddress}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {hasCoords ? "Update" : "Save"}
                </>
              )}
            </Button>
          </div>
          {selectedAddress && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedAddress.full_address}
            </p>
          )}
        </div>

        {/* Map preview */}
        {isLoaded && displayCoords && (
          <div className="rounded-lg overflow-hidden border">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={displayCoords}
              zoom={14}
              options={mapOptions}
            >
              <Marker position={displayCoords} />
            </GoogleMap>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <p className={
            message.type === "error"
              ? "text-sm text-destructive"
              : "text-sm text-green-600 dark:text-green-400"
          }>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
