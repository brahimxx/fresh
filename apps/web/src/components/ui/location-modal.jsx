"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin,
  LocateFixed,
  Loader2,
  Home,
  Briefcase,
  Building,
  Heart,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const MAPS_LIBRARIES = ["places"];

const ADDRESS_ICON_MAP = {
  Home: Home,
  Briefcase: Briefcase,
  Building: Building,
  Heart: Heart,
  Star: Star,
  MapPin: MapPin,
};

const mapContainerStyle = {
  width: "100%",
  height: "200px",
  borderRadius: "0.5rem",
};

export function LocationModal({
  open,
  onOpenChange,
  onLocationSubmit, // callback when a location is finally confirmed: (address, lat, lng) => void
  initialAddress = "",
  initialCoords = null,
}) {
  const [pendingAddress, setPendingAddress] = useState(initialAddress);
  const [pendingCoords, setPendingCoords] = useState(initialCoords);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (open) {
      setPendingAddress(initialAddress || "");
      setPendingCoords(initialCoords || null);
      setLocationError("");
    }
  }, [open, initialAddress, initialCoords]);

  useEffect(() => {
    if (!open) return;
    async function loadSavedAddresses() {
      setLoadingSavedAddresses(true);
      try {
        const res = await fetch("/api/user/addresses");
        if (!res.ok) {
          setSavedAddresses([]);
          return;
        }
        const json = await res.json();
        setSavedAddresses(json?.data?.addresses || []);
      } catch (error) {
        console.error("Failed to load saved addresses", error);
        setSavedAddresses([]);
      } finally {
        setLoadingSavedAddresses(false);
      }
    }
    loadSavedAddresses();
  }, [open]);

  // Request high-accuracy user location
  function requestCurrentLocation() {
    setLocating(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setLocating(false);
            if (status === "OK" && results?.[0]?.formatted_address) {
              setPendingAddress(results[0].formatted_address);
              setPendingCoords({ lat, lng });
              return;
            }
            setPendingAddress("Current location");
            setPendingCoords({ lat, lng });
          });
          return;
        }

        setLocating(false);
        setPendingAddress("Current location");
        setPendingCoords({ lat, lng });
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case 1:
            setLocationError(
              "Location permission was denied. Please enter your address manually."
            );
            break;
          case 2:
            setLocationError(
              "Location information is unavailable. Please enter your address manually."
            );
            break;
          case 3:
            setLocationError(
              "Location request timed out. Please enter your address manually."
            );
            break;
          default:
            setLocationError(
              "Could not determine your location. Please enter your address manually."
            );
            break;
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  const handleMapClick = useCallback((e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPendingCoords({ lat, lng });

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          setPendingAddress(results[0].formatted_address);
        }
      });
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPendingCoords({ lat, lng });

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          setPendingAddress(results[0].formatted_address);
        }
      });
    }
  }, []);

  function handleConfirm() {
    if (
      !pendingAddress ||
      !pendingAddress.trim() ||
      !pendingCoords ||
      !Number.isFinite(Number(pendingCoords.lat)) ||
      !Number.isFinite(Number(pendingCoords.lng))
    ) {
      setLocationError("Please choose a valid location before continuing.");
      return;
    }
    setLocationError("");
    onLocationSubmit(pendingAddress, pendingCoords.lat, pendingCoords.lng);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Where should the service take place?</DialogTitle>
          <DialogDescription>
            Provide your exact location for mobile services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start h-12 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            onClick={requestCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5 mr-3" />
            )}
            <span className="font-medium text-base">
              {locating
                ? "Detecting your location..."
                : "Use my current location (GPS)"}
            </span>
          </Button>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Search exact address</Label>
            <AddressAutocomplete
              value={pendingAddress}
              placeholder="Start typing your address..."
              onChange={(location) => {
                const nextAddress = location.full_address || "";
                setPendingAddress(nextAddress);
                if (location.lat !== undefined && location.lng !== undefined) {
                  setPendingCoords({ lat: location.lat, lng: location.lng });
                } else {
                  setPendingCoords(null);
                }
                setLocationError("");
              }}
            />
          </div>

          {/* Map display */}
          {isLoaded && pendingCoords && (
            <div className="space-y-1.5 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-medium text-muted-foreground">
                  Adjust pin if needed
                </Label>
              </div>
              <div className="border border-border rounded-lg overflow-hidden relative shadow-inner">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={pendingCoords}
                  zoom={16}
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                    gestureHandling: "greedy",
                  }}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                >
                  <Marker
                    position={pendingCoords}
                    draggable={true}
                    onDragEnd={handleDragEnd}
                    animation={window.google.maps.Animation.DROP}
                  />
                </GoogleMap>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium text-muted-foreground">
              Saved addresses
            </Label>
            {loadingSavedAddresses ? (
              <div className="flex items-center gap-2 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : savedAddresses.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {savedAddresses.map((addr) => {
                  const Icon = ADDRESS_ICON_MAP[addr.iconName] || MapPin;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      className="w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors flex items-center gap-3"
                      onClick={() => {
                        setPendingAddress(addr.fullAddress || "");
                        setPendingCoords({
                          lat: Number(addr.lat),
                          lng: Number(addr.lng),
                        });
                        setLocationError("");
                      }}
                    >
                      <div className="bg-muted p-2 rounded-full shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {addr.label || "Saved address"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {addr.fullAddress}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved addresses available.
              </p>
            )}
          </div>

          {locationError && (
            <p className="text-sm font-medium text-destructive">
              {locationError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="min-w-[120px]"
            disabled={
              !pendingAddress ||
              !pendingAddress.trim() ||
              !pendingCoords ||
              !Number.isFinite(Number(pendingCoords.lat)) ||
              !Number.isFinite(Number(pendingCoords.lng))
            }
          >
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
