'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  MapPin,
  Scissors,
  Map,
  Star,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  X,
  Clock,
  Grid,
  List as ListIcon,
  Home,
  Briefcase,
  LocateFixed,
  Locate,
  Navigation,
  Heart,
  Building,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/providers/auth-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useJsApiLoader } from '@react-google-maps/api';

const MAPS_LIBRARIES = ['places'];
const autocompleteCache = new globalThis.Map();
const geocodeCache = new globalThis.Map();

function SearchBarContent({
  initialSearchQuery,
  initialLocationQuery,
  className = '',
  size = 'lg'
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultSearch = initialSearchQuery !== undefined ? initialSearchQuery : (searchParams.get('q') || '');
  const defaultLocation = initialLocationQuery !== undefined ? initialLocationQuery : (searchParams.get('location') || '');

  const { isAuthenticated } = useAuth();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });

  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [locationQuery, setLocationQuery] = useState(defaultLocation);

  // Sync when URL changes
  useEffect(() => {
    if (initialSearchQuery === undefined) {
      setSearchQuery(searchParams.get('q') || '');
    }
  }, [searchParams, initialSearchQuery]);

  useEffect(() => {
    if (initialLocationQuery === undefined) {
      setLocationQuery(searchParams.get('location') || '');
    }
  }, [searchParams, initialLocationQuery]);

  // Suggestion Dropdown States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Location suggestion states
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [silentLocation, setSilentLocation] = useState(null);

  // New location data states
  const [recentSearches, setRecentSearches] = useState([]);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isManagingAddresses, setIsManagingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({ label: '', full_address: '', icon_name: 'Home', is_default: false });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(null);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const locationDropdownRef = useRef(null);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState('60vh');
  const [locationDropdownMaxHeight, setLocationDropdownMaxHeight] = useState('60vh');

  // Debounce both inputs
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedLocationQuery = useDebounce(locationQuery, 300);

  // Prevent background scrolling when location dropdown is open
  useEffect(() => {
    if (showLocationSuggestions) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showLocationSuggestions]);

  // Load Saved Locations and Recent Searches on mount
  useEffect(() => {
    // 1. Fetch saved addresses from backend
    async function fetchSaved() {
      try {
        const res = await fetch('/api/user/addresses');
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.addresses) {
            setUserAddresses(data.addresses);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user addresses', e);
      }
    }
    fetchSaved();

    // 2. Load recent searches from LocalStorage
    try {
      const stored = localStorage.getItem('fresh_recent_locations');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse recent locations', e);
    }

    // 3. Silently fetch IP-based rough coords to prioritize search suggestions
    fetch('http://ip-api.com/json/?fields=lat,lon')
      .then(res => res.json())
      .then(data => {
        if (data.lat && data.lon) {
          setSilentLocation({ lat: data.lat, lng: data.lon });
        }
      })
      .catch(() => { });
  }, []);

  // Save to recent searches
  const saveRecentSearch = (cityLabel) => {
    if (!cityLabel) return;

    setRecentSearches((prev) => {
      // Remove if it already exists to move it to the top
      const filtered = prev.filter(item => item !== cityLabel);
      const updated = [cityLabel, ...filtered].slice(0, 5); // Keep max 5

      try {
        localStorage.setItem('fresh_recent_locations', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save to local storage', e);
      }
      return updated;
    });
  };

  const clearRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('fresh_recent_locations');
  };

  const handleInlineSaveAddress = async () => {
    setIsSavingAddress(true);
    try {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAddressForm,
          lat: newAddressForm.lat || 48.8566,
          lng: newAddressForm.lng || 2.3522,
        })
      });
      if (res.ok) {
        const { data } = await res.json();
        setUserAddresses(prev => [data, ...prev].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
        setIsAddingAddress(false);
        setNewAddressForm({ label: '', full_address: '', icon_name: 'Home', is_default: false });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleInlineDeleteAddress = async (id, e) => {
    e.stopPropagation();
    setIsDeletingAddress(id);
    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUserAddresses(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingAddress(null);
    }
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);

    if (navigator.geolocation) {
      // Generous timeout so the browser has time to show the permission popup
      const fallbackTimeout = setTimeout(() => {
        fallbackToIP();
      }, 16000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(fallbackTimeout);
          try {
            const { latitude, longitude } = position.coords;
            const city = 'Current Location';

            setLocationQuery(city);
            setShowLocationSuggestions(false);
            saveRecentSearch(city);

            const params = new URLSearchParams();
            if (searchQuery) params.append('q', searchQuery);
            params.append('location', city);
            params.append('userLat', latitude.toString());
            params.append('userLng', longitude.toString());

            router.push('/salons?' + params.toString());
          } catch (e) {
            fallbackToIP(position.coords);
          } finally {
            setIsGettingLocation(false);
          }
        },
        () => {
          clearTimeout(fallbackTimeout);
          fallbackToIP();
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      fallbackToIP();
    }

    async function fallbackToIP(coords = null) {
      try {
        const res = await fetch('http://ip-api.com/json/?fields=lat,lon');
        const data = await res.json();
        const city = 'Current Location';
        setLocationQuery(city);
        setShowLocationSuggestions(false);
        saveRecentSearch(city);

        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        params.append('location', city);

        const finalLat = coords?.latitude || data.lat;
        const finalLng = coords?.longitude || data.lon;
        if (finalLat && finalLng) {
          params.append('userLat', finalLat.toString());
          params.append('userLng', finalLng.toString());
        }

        router.push('/salons?' + params.toString());
      } catch (e) {
        setLocationQuery('Current Location');
        setShowLocationSuggestions(false);

        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        params.append('location', 'Current Location');
        if (coords) {
          params.append('userLat', coords.latitude.toString());
          params.append('userLng', coords.longitude.toString());
        }
        router.push('/salons?' + params.toString());
        console.error('IP Fallback failed', e);
      } finally {
        setIsGettingLocation(false);
      }
    }
  };

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowLocationSuggestions(false);
      }
    }
    // Use capture phase so the map can't swallow the event before it reaches the document
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  // Calculate dynamic height for service suggestions dropdown
  useEffect(() => {
    function recalc() {
      if (!dropdownRef.current) return;
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - dropdownRect.top;
      const height = Math.max(200, spaceBelow - 16);
      setDropdownMaxHeight(`${height}px`);
    }
    if (showSuggestions) {
      requestAnimationFrame(recalc);
      window.addEventListener('resize', recalc);
      window.addEventListener('scroll', recalc, { passive: true });
      return () => {
        window.removeEventListener('resize', recalc);
        window.removeEventListener('scroll', recalc);
      };
    }
  }, [showSuggestions, debouncedSearchQuery]);

  // Calculate dynamic height for location suggestions dropdown
  useEffect(() => {
    function recalcLocation() {
      if (!locationDropdownRef.current) return;
      const rect = locationDropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.top;
      const height = Math.max(200, spaceBelow - 16);
      setLocationDropdownMaxHeight(`${height}px`);
    }
    if (showLocationSuggestions) {
      requestAnimationFrame(recalcLocation);
      window.addEventListener('resize', recalcLocation);
      window.addEventListener('scroll', recalcLocation, { passive: true });
      return () => {
        window.removeEventListener('resize', recalcLocation);
        window.removeEventListener('scroll', recalcLocation);
      };
    }
  }, [showLocationSuggestions, debouncedLocationQuery]);

  // Fetch city suggestions when debounced location query changes
  useEffect(() => {
    async function fetchCities() {
      if (!debouncedLocationQuery.trim()) {
        setLocationSuggestions([]);
        return;
      }
      if (!isLoaded || !window.google?.maps?.places) {
        return;
      }

      // Require at least 3 characters to save API calls
      if (debouncedLocationQuery.length < 3) {
        setLocationSuggestions([]);
        return;
      }

      // Check local memory cache before hitting Google API
      const cacheKey = debouncedLocationQuery.toLowerCase().trim();
      if (autocompleteCache.has(cacheKey)) {
        setLocationSuggestions(autocompleteCache.get(cacheKey));
        return;
      }

      setIsSearchingLocation(true);
      try {
        const autocompleteService = new window.google.maps.places.AutocompleteService();

        const request = {
          input: debouncedLocationQuery,
        };

        if (silentLocation?.lat && silentLocation?.lng) {
          request.locationBias = {
            radius: 50000, // 50km radius bias
            center: { lat: silentLocation.lat, lng: silentLocation.lng }
          };
        }

        autocompleteService.getPlacePredictions(request, (predictions, status) => {
          setIsSearchingLocation(false);

          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setLocationSuggestions([]);
            return;
          }

          const formatted = predictions.map(item => ({
            label: item.description,
            city: item.structured_formatting?.main_text || item.description,
            state: item.structured_formatting?.secondary_text || '',
            place_id: item.place_id,
          }));

          // Deduplicate
          const unique = [];
          const seen = new Set();
          for (const loc of formatted) {
            const key = `${loc.city}-${loc.state}`;
            if (!seen.has(key) && loc.city) {
              seen.add(key);
              unique.push(loc);
            }
          }

          const finalSuggestions = unique.length > 0 ? unique : formatted;
          autocompleteCache.set(cacheKey, finalSuggestions); // Cache the result
          setLocationSuggestions(finalSuggestions);
        });
      } catch (e) {
        console.error('Failed to fetch Google Places suggestions:', e);
        setIsSearchingLocation(false);
      }
    }
    fetchCities();
  }, [debouncedLocationQuery, silentLocation, isLoaded]);

  // Fetch live suggestions when debounced query changes
  useEffect(() => {
    async function fetchSuggestions() {
      if (!debouncedSearchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        params.append('q', debouncedSearchQuery);
        params.append('limit', '4'); // Only fetch top 4 salons for suggestions

        const res = await fetch('/api/marketplace/salons?' + params.toString());
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
      } finally {
        setIsSearching(false);
      }
    }

    fetchSuggestions();
  }, [debouncedSearchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setShowLocationSuggestions(false);

    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (locationQuery) params.append('location', locationQuery);

    router.push('/salons?' + params.toString());
  };

  const handleSuggestionClick = (salonId) => {
    setShowSuggestions(false);
    setShowLocationSuggestions(false);
    router.push('/salon/' + salonId);
  };

  const handleServiceSuggestionClick = (serviceName) => {
    setSearchQuery(serviceName);
    setShowSuggestions(false);
    setShowLocationSuggestions(false);
    router.push('/salons?q=' + encodeURIComponent(serviceName));
  };

  const handleLocationSuggestionClick = async (locArg) => {
    let cityLabel = '';
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);

    if (typeof locArg === 'string') {
      cityLabel = locArg;
      params.append('location', cityLabel);
    } else {
      cityLabel = locArg.city || locArg.label || locArg.fullAddress || 'Selected Location';
      params.append('location', cityLabel);

      const lat = locArg.lat;
      const lng = locArg.lng || locArg.lon;

      if (lat && lng) {
        params.append('userLat', lat.toString());
        params.append('userLng', lng.toString());
      } else if (locArg.place_id) {
        // Quick check of memory cache
        if (geocodeCache.has(locArg.place_id)) {
          const coords = geocodeCache.get(locArg.place_id);
          params.append('userLat', coords.lat.toString());
          params.append('userLng', coords.lng.toString());
        } else if (window.google?.maps?.Geocoder) {
          // Geocode fallback without cache
          try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ placeId: locArg.place_id });
            if (response.results && response.results[0]) {
              const loc = response.results[0].geometry.location;
              const lat = loc.lat();
              const lng = loc.lng();

              geocodeCache.set(locArg.place_id, { lat, lng }); // Cache it

              params.append('userLat', lat.toString());
              params.append('userLng', lng.toString());
            }
          } catch (e) {
            console.error('Failed to geocode place_id:', e);
          }
        }
      }
    }

    setLocationQuery(cityLabel);
    saveRecentSearch(cityLabel);
    setShowLocationSuggestions(false);
    router.push('/salons?' + params.toString());
  };

  // Filter popular services locally based on input
  // Services logic (we'll simply provide a hardcoded list of matches here for now)
  const ALL_SERVICES = [
    'Haircut', 'Hair Coloring', 'Manicure', 'Pedicure',
    'Massage', 'Facial', 'Waxing', 'Eyebrow Threading',
    'Beard Trim', 'Balayage', 'Keratin Treatment', 'Gel Nails'
  ];

  const matchedServices = debouncedSearchQuery.trim()
    ? ALL_SERVICES.filter(service =>
      service.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    )
    : [];

  const isLg = size === 'lg';
  const isCompact = size === 'compact';

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShowSuggestions(false);
          setShowLocationSuggestions(false);
        }
      }}
    >
      {/* Pill Container for Search */}
      <form
        onSubmit={handleSearchSubmit}
        className={`flex items-center bg-background border border-border/50 transition-shadow ${isCompact ? 'flex-row rounded-full p-0.5 shadow-sm hover:shadow-md' : isLg ? 'flex-col md:flex-row rounded-[2rem] p-1.5 shadow-xl hover:shadow-2xl' : 'flex-col md:flex-row rounded-2xl p-1 md:rounded-full shadow-xl hover:shadow-2xl'}`}
      >
        {/* Service Input */}
        <div className={`relative flex-1 bg-transparent flex items-center ${isCompact ? 'px-3 w-auto' : 'px-4 w-full'}`}>
          <Search className={`text-muted-foreground mr-2 shrink-0 ${isCompact ? 'h-3.5 w-3.5' : isLg ? 'h-5 w-5' : 'h-4 w-4'}`} />
          <input
            placeholder={isCompact ? 'Services or salons...' : 'All treatments and venues'}
            className={`w-full bg-transparent outline-none border-none focus:ring-0 placeholder:text-muted-foreground ${isCompact ? 'h-8 text-xs' : isLg ? 'h-14 text-base' : 'h-10 text-sm'}`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              setShowLocationSuggestions(false);
            }}
          />
        </div>

        {/* Divider */}
        <div className={`${isCompact ? 'block' : 'hidden md:block'} w-px ${isCompact ? 'h-5' : 'h-8'} bg-border/50 mx-2 shrink-0`} />

        {/* Location Input */}
        <div className={`relative flex-1 flex items-center ${isCompact ? 'px-3 w-auto' : 'px-4 w-full border-t border-border/50 md:border-none mt-2 md:mt-0 pt-2 md:pt-0'}`}>
          <MapPin className={`text-muted-foreground mr-2 shrink-0 ${isCompact ? 'h-3.5 w-3.5' : isLg ? 'h-5 w-5' : 'h-4 w-4'}`} />
          <input
            placeholder={
              locationQuery === 'Current Location' ? 'Current Location' :
                locationQuery === 'Map area' ? 'Map area' :
                  (isCompact ? 'Location' : 'City or location')
            }
            className={`w-full bg-transparent outline-none border-none focus:ring-0 ${locationQuery === 'Current Location' || locationQuery === 'Map area' ? 'placeholder:text-foreground font-medium' : 'placeholder:text-muted-foreground'} ${isCompact ? 'h-8 text-xs' : isLg ? 'h-14 text-base' : 'h-10 text-sm'}`}
            value={locationQuery === 'Current Location' || locationQuery === 'Map area' ? '' : locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setShowLocationSuggestions(true);
              setShowSuggestions(false);
              setIsManagingAddresses(false);
              setIsAddingAddress(false);
            }}
            onFocus={() => {
              setShowLocationSuggestions(true);
              setShowSuggestions(false);
            }}
          />

          {/* Location Suggestions Dropdown */}
          {showLocationSuggestions && (
            <div
              ref={locationDropdownRef}
              className="absolute top-[calc(100%+0.5rem)] left-0 w-full rounded-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 bg-popover text-popover-foreground border border-border/20"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                maxHeight: locationDropdownMaxHeight, // Stretches to bottom of viewport
                overflowY: 'auto',
              }}
            >
              {/* We removed the inline Add/Manage UI from here. It is now a Dialog overlay at the end of the component. */}
              {(!locationQuery.trim() || !debouncedLocationQuery.trim()) ? (
                <div className="flex flex-col w-full py-4 space-y-4">

                  {/* 1. High-Accuracy Current Location */}
                  <div className="px-6">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="w-full text-left py-2.5 transition-colors flex items-center gap-4 hover:bg-muted/50 rounded-xl px-2 -mx-2 group disabled:opacity-70"
                    >
                      <Locate className={`h-5 w-5 text-primary shrink-0 ${isGettingLocation ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium text-primary block">
                          {isGettingLocation ? 'Finding your location...' : 'Current location'}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* 2. Saved Locations */}
                  {isAuthenticated && (
                    <div className="px-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Saved</h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (userAddresses.length > 0) {
                              setShowLocationSuggestions(false);
                              setIsManagingAddresses(true);
                            } else {
                              setShowLocationSuggestions(false);
                              setIsAddingAddress(true);
                            }
                          }}
                          className="text-[12px] text-primary hover:underline font-medium"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-1">
                        {userAddresses.length > 0 ? (
                          userAddresses.map((addr) => {
                            // Map icon string to component safely
                            const IconComponent = { Home, Briefcase, Heart, MapPin, Building, Star }[addr.iconName] || MapPin;

                            return (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => handleLocationSuggestionClick({
                                  label: addr.fullAddress,
                                  lat: addr.lat,
                                  lng: addr.lng
                                })}
                                className="w-full text-left py-2.5 transition-colors flex items-center gap-4 hover:bg-muted/50 rounded-xl px-2 -mx-2 group"
                              >
                                <IconComponent className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-popover-foreground transition-colors" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-medium text-popover-foreground block">{addr.label}</span>
                                    {addr.isDefault && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3">Default</Badge>}
                                  </div>
                                  <span className="text-[13px] text-muted-foreground truncate block">{addr.fullAddress}</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowLocationSuggestions(false);
                              setIsAddingAddress(true);
                            }}
                            className="w-full text-left py-2.5 transition-colors flex items-center gap-4 hover:bg-muted/50 rounded-xl px-2 -mx-2 group"
                          >
                            <Plus className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[14px] font-medium text-primary block hover:underline">Add New Address</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="px-6 pt-2 border-t border-border/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Recent Searches</h4>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          className="text-[12px] text-muted-foreground hover:text-popover-foreground underline"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((loc, i) => (
                          <button
                            key={loc + i}
                            type="button"
                            onClick={() => handleLocationSuggestionClick(loc)}
                            className="w-full text-left py-2.5 transition-colors flex items-center gap-4 hover:bg-muted/50 rounded-xl px-2 -mx-2 group"
                          >
                            <Clock className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-popover-foreground transition-colors" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[14px] font-medium text-popover-foreground truncate block">{loc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (/* Autocomplete state when typing */
                isSearchingLocation ? (
                  <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Searching locations...
                  </div>
                ) : locationSuggestions.length > 0 ? (
                  <div className="flex flex-col w-full py-2">
                    <h4 className="text-[13px] font-bold text-popover-foreground px-4 pt-2 pb-1">Locations</h4>
                    {locationSuggestions.map((loc, i) => (
                      <button
                        key={loc.label + i}
                        type="button"
                        onClick={() => handleLocationSuggestionClick(loc)}
                        className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 hover:bg-muted"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[15px] font-medium text-popover-foreground">{loc.city}</span>
                          {loc.state && (
                            <span className="text-[13px] text-muted-foreground ml-1">{loc.state}</span>
                          )}
                        </div>
                        <span className="text-[12px] text-muted-foreground/70 shrink-0">
                          {loc.salon_count} {loc.salon_count === 1 ? 'salon' : 'salons'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <MapPin className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-popover-foreground">No locations found</p>
                    <p className="text-[13px] mt-1 text-muted-foreground">Try a different city or area</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          size={isCompact ? 'icon-sm' : isLg ? 'lg' : 'default'}
          className={`shrink-0 ${isCompact ? 'h-7 w-7 rounded-full shadow-none' : isLg ? 'w-full md:w-auto font-semibold shadow-md h-14 px-8 rounded-full text-base mt-2 md:mt-0' : 'w-full md:w-auto font-semibold shadow-md h-10 px-6 rounded-full mt-2 md:mt-0'}`}
        >
          {isCompact ? <Search className="h-3.5 w-3.5" /> : isLg ? 'Search' : <><Search className="h-4 w-4 mr-2" /> Search</>}
        </Button>
      </form>

      {/* Live Search Suggestions Dropdown */}
      {showSuggestions && searchQuery.trim() && debouncedSearchQuery.trim() && (
        <div
          ref={dropdownRef}
          className="absolute top-[calc(100%+0.5rem)] left-0 w-full md:w-[420px] rounded-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 bg-popover text-popover-foreground border border-border/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            maxHeight: dropdownMaxHeight,
            overflowY: 'auto',
          }}
        >
          {isSearching ? (
            <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              Searching...
            </div>
          ) : (
            <div className="flex flex-col w-full pb-4">

              {/* Services Matches */}
              {matchedServices.length > 0 && (
                <div className="pt-4 px-2">
                  <h4 className="text-[13px] font-bold text-popover-foreground px-4 mb-2">Treatments</h4>
                  {matchedServices.map((service, index) => (
                    <button
                      key={service + index}
                      type="button"
                      onClick={() => handleServiceSuggestionClick(service)}
                      className="w-full text-left px-4 py-3 text-[15px] font-medium rounded-xl transition-colors flex items-center gap-4 text-popover-foreground hover:bg-muted"
                    >
                      <Search className="h-5 w-5 text-muted-foreground" />
                      <span>{service}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Salon Matches */}
              {suggestions.length > 0 && (
                <div className="pt-4 px-2">
                  <h4 className="text-[13px] font-bold text-popover-foreground px-4 mb-2">Venues</h4>
                  {suggestions.map(salon => (
                    <button
                      key={salon.id}
                      type="button"
                      onClick={() => handleSuggestionClick(salon.id)}
                      className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-4 hover:bg-muted"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {salon.cover_image_url ? (
                          <img src={salon.cover_image_url} alt={salon.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Search className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[15px] truncate text-popover-foreground">
                          {salon.name}
                        </div>
                        <div className="flex flex-col text-[13px] mt-0.5 text-muted-foreground">
                          <span className="truncate">{salon.category || 'Salon'} • {salon.address || salon.city}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!suggestions.length && !matchedServices.length && !isSearching && (
                <div className="p-8 text-center mt-2 border-t border-border/20">
                  <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-popover-foreground">No results found</p>
                  <p className="text-[13px] mt-1 text-muted-foreground">Try adjusting your search terms</p>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Address Management Overlays */}
      <Dialog
        open={isAddingAddress || isManagingAddresses}
        onOpenChange={(val) => {
          if (!val) {
            setIsAddingAddress(false);
            setIsManagingAddresses(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {isAddingAddress ? (
            <>
              <DialogHeader>
                <div className="flex items-center">
                  {isManagingAddresses && (
                    <button onClick={() => setIsAddingAddress(false)} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium mr-2">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                  )}
                  <DialogTitle>Add Address</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Label</label>
                  <Input placeholder="e.g. Gym, Office" value={newAddressForm.label} onChange={e => setNewAddressForm({ ...newAddressForm, label: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Icon</label>
                  <div className="flex gap-2">
                    {[
                      { name: 'Home', Icon: Home },
                      { name: 'Briefcase', Icon: Briefcase },
                      { name: 'Heart', Icon: Heart },
                      { name: 'MapPin', Icon: MapPin },
                      { name: 'Building', Icon: Building },
                      { name: 'Star', Icon: Star }
                    ].map(({ name, Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setNewAddressForm({ ...newAddressForm, icon_name: name })}
                        className={`h-10 flex-1 rounded-md border flex items-center justify-center transition-colors ${newAddressForm.icon_name === name ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background/50 text-muted-foreground hover:bg-muted'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Full Address</label>
                  <AddressAutocomplete
                    value={newAddressForm.full_address}
                    onChange={(loc) => setNewAddressForm({ ...newAddressForm, full_address: loc.full_address, lat: loc.lat || newAddressForm.lat, lng: loc.lng || newAddressForm.lng })}
                    placeholder="123 Main St, City"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="is_default_modal" className="rounded text-primary focus:ring-primary" checked={newAddressForm.is_default} onChange={e => setNewAddressForm({ ...newAddressForm, is_default: e.target.checked })} />
                  <label htmlFor="is_default_modal" className="text-sm cursor-pointer font-medium">Set as default address</label>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={handleInlineSaveAddress}
                  disabled={!newAddressForm.label || !newAddressForm.full_address || isSavingAddress}
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address'}
                </Button>
              </div>
            </>
          ) : isManagingAddresses ? (
            <>
              <DialogHeader>
                <DialogTitle>Manage Addresses</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto pr-2">
                {userAddresses.length > 0 ? (
                  userAddresses.map((addr) => {
                    const IconComponent = { Home, Briefcase, Heart, MapPin, Building, Star }[addr.iconName] || MapPin;
                    return (
                      <div key={addr.id} className="w-full flex items-center justify-between py-3 border-b border-border/10 last:border-0 group">
                        <div className="flex items-center gap-4 min-w-0 pr-4">
                          <IconComponent className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-popover-foreground flex items-center gap-2">
                              {addr.label}
                              {addr.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Default</Badge>}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block pt-0.5">{addr.fullAddress}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleInlineDeleteAddress(addr.id, e)}
                          disabled={isDeletingAddress === addr.id}
                          className="text-xs text-destructive hover:font-semibold shrink-0"
                        >
                          {isDeletingAddress === addr.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No saved addresses.</p>
                )}

                <button
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full text-left py-4 mt-2 transition-colors flex items-center gap-3 rounded-lg group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary group-hover:underline">Add New Address</span>
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SearchBar(props) {
  return (
    <Suspense fallback={<div className="h-10 w-full bg-muted rounded-full animate-pulse" />}>
      <SearchBarContent {...props} />
    </Suspense>
  );
}
