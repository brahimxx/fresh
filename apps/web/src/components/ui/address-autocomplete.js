'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useDebounce } from '@/hooks/use-debounce';

const MAPS_LIBRARIES = ['places'];
const autocompleteCache = new globalThis.Map();
const geocodeCache = new globalThis.Map();

export function AddressAutocomplete({ value, onChange, placeholder = "123 Main St, City, Country" }) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: MAPS_LIBRARIES,
    });

    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [silentLocation, setSilentLocation] = useState(null);

    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownMaxHeight, setDropdownMaxHeight] = useState('60vh');

    const debouncedQuery = useDebounce(query, 300);

    // Sync prop changes
    useEffect(() => {
        if (value !== query) {
            setQuery(value || '');
        }
    }, [value]);

    useEffect(() => {
        fetch('http://ip-api.com/json/?fields=lat,lon')
            .then(res => res.json())
            .then(data => {
                if (data.lat && data.lon) {
                    setSilentLocation({ lat: data.lat, lng: data.lon });
                }
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    useEffect(() => {
        function recalc() {
            if (!dropdownRef.current) return;
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.top;
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
    }, [showSuggestions, debouncedQuery]);

    useEffect(() => {
        async function fetchPlaces() {
            if (!debouncedQuery.trim()) {
                setSuggestions([]);
                return;
            }
            if (!isLoaded || !window.google?.maps?.places) return;

            if (debouncedQuery.length < 3) {
                setSuggestions([]);
                return;
            }

            const cacheKey = debouncedQuery.toLowerCase().trim();
            if (autocompleteCache.has(cacheKey)) {
                setSuggestions(autocompleteCache.get(cacheKey));
                return;
            }

            setIsSearching(true);
            try {
                const autocompleteService = new window.google.maps.places.AutocompleteService();

                const request = {
                    input: debouncedQuery,
                };

                if (silentLocation?.lat && silentLocation?.lng) {
                    request.locationBias = {
                        radius: 50000,
                        center: { lat: silentLocation.lat, lng: silentLocation.lng }
                    };
                }

                autocompleteService.getPlacePredictions(request, (predictions, status) => {
                    setIsSearching(false);

                    if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
                        setSuggestions([]);
                        return;
                    }

                    const formatted = predictions.map(item => ({
                        label: item.description,
                        main: item.structured_formatting?.main_text || item.description,
                        secondary: item.structured_formatting?.secondary_text || '',
                        place_id: item.place_id,
                    }));

                    autocompleteCache.set(cacheKey, formatted);
                    setSuggestions(formatted);
                });
            } catch (e) {
                console.error('Places API error:', e);
                setIsSearching(false);
            }
        }
        fetchPlaces();
    }, [debouncedQuery, silentLocation, isLoaded]);

    const handleSelect = async (loc) => {
        setQuery(loc.label);
        setShowSuggestions(false);

        let lat, lng;

        if (loc.place_id) {
            if (geocodeCache.has(loc.place_id)) {
                const coords = geocodeCache.get(loc.place_id);
                lat = coords.lat;
                lng = coords.lng;
            } else if (window.google?.maps?.Geocoder) {
                try {
                    const geocoder = new window.google.maps.Geocoder();
                    const response = await geocoder.geocode({ placeId: loc.place_id });
                    if (response.results && response.results[0]) {
                        const geocodedLoc = response.results[0].geometry.location;
                        lat = geocodedLoc.lat();
                        lng = geocodedLoc.lng();
                        geocodeCache.set(loc.place_id, { lat, lng });
                    }
                } catch (e) {
                    console.error('Geocode error:', e);
                }
            }
        }

        if (onChange) {
            onChange({
                full_address: loc.label,
                lat,
                lng,
            });
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <Input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                    if (onChange) {
                        onChange({ full_address: e.target.value, lat: undefined, lng: undefined });
                    }
                }}
                onFocus={() => setShowSuggestions(true)}
            />

            {showSuggestions && query.trim() && (
                <div
                    ref={dropdownRef}
                    className="absolute top-[calc(100%+0.5rem)] left-0 w-full rounded-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 bg-popover text-popover-foreground border border-border/20"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        maxHeight: dropdownMaxHeight,
                        overflowY: 'auto',
                    }}
                >
                    {isSearching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                            Searching addresses...
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="flex flex-col w-full py-2">
                            <h4 className="text-[13px] font-bold text-popover-foreground px-4 pt-2 pb-1">Addresses</h4>
                            {suggestions.map((loc, i) => (
                                <button
                                    key={loc.place_id + i}
                                    type="button"
                                    onClick={() => handleSelect(loc)}
                                    className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 hover:bg-muted"
                                >
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[15px] font-medium text-popover-foreground">{loc.main}</span>
                                        {loc.secondary && (
                                            <span className="text-[13px] text-muted-foreground ml-1">{loc.secondary}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : debouncedQuery.length >= 3 ? (
                        <div className="p-6 text-center">
                            <MapPin className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-sm font-semibold text-popover-foreground">No addresses found</p>
                            <p className="text-[13px] mt-1 text-muted-foreground">Try a different address</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
