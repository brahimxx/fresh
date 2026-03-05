'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, OverlayView, OverlayViewF } from '@react-google-maps/api';

/* ───────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ─────────────────────────────────────────────────────────────────────────── */
const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };
const DEFAULT_ZOOM = 12;

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: typeof window !== 'undefined' ? { position: 9 } : undefined, // 9 = RIGHT_BOTTOM
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: '100%',
};

/* ───────────────────────────────────────────────────────────────────────────
   Custom Pin Component
   ─────────────────────────────────────────────────────────────────────────── */
function SalonPin({ salon, ratingText, onClick }) {
  const pinRef = useRef(null);

  useEffect(() => {
    const el = pinRef.current;
    if (!el) return;

    const handleMouseEnter = () => {
      if (el.parentNode) el.parentNode.style.zIndex = '10000';
    };
    const handleMouseLeave = () => {
      if (el.parentNode && !el.classList.contains('is-external-hovered')) {
        el.parentNode.style.zIndex = '1';
      }
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={pinRef}
      className="salon-pin-base"
      data-salon-id={salon.id}
      onClick={onClick}
      style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
    >
      <svg viewBox="-2 -2 46 59" width="46" height="59" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
        <path d="M21 54 C21 54 42 33 42 21 C42 9.4 32.6 0 21 0 C9.4 0 0 9.4 0 21 C0 33 21 54 21 54Z" fill="#2d2d2d" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
        <text className="salon-pin-text" x="21" y="24" textAnchor="middle" fill="white" fontFamily="Inter, system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="700" dominantBaseline="central">{ratingText}</text>
        <text className="salon-star" x="21" y="35" textAnchor="middle" fill="#ffc00a" fontSize="11" dominantBaseline="central" opacity="0">★</text>
      </svg>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   InfoWindow (popup) Component
   ─────────────────────────────────────────────────────────────────────────── */
function SalonInfoWindow({ salon, ratingText, onClose }) {
  return (
    <div
      className="salon-info-window"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          border: 'none', borderRadius: '50%', width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', fontSize: 14, lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Image */}
      <div style={{
        height: 100,
        background: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #fbcfe8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {salon.cover_image_url ? (
          <img src={salon.cover_image_url} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 28 }}>💇</span>
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 11, fontWeight: 600,
          padding: '3px 8px', borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <span style={{ color: '#ffc00a' }}>★</span>
          {ratingText}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 4, lineHeight: 1.3 }}>
          {salon.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
          <span>{salon.category || 'Salon'}</span>
          {salon.price_level && (
            <>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{'$'.repeat(salon.price_level)}</span>
            </>
          )}
        </div>
        {salon.address && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            📍 {salon.address}
          </div>
        )}
        <a
          href={`/salon/${salon.id}`}
          style={{
            display: 'block', textAlign: 'center', marginTop: 10,
            padding: '7px 0', background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
            color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', transition: 'opacity 0.2s',
          }}
        >
          View Salon →
        </a>
      </div>
    </div>
  );
}

/* ── Global references  ──────────────────────────────────────────────── */
const MAPS_LIBRARIES = ['places'];

/* ───────────────────────────────────────────────────────────────────────────
   SALON MAP COMPONENT
   ─────────────────────────────────────────────────────────────────────────── */
export function SalonMap({
  salons = [],
  userLocation = null,
  searchLocation = null,
  className = '',
  isExpanded = false,
  onToggleExpand = () => { },
  hoveredSalonId = null,
  onBoundsChange = null,
  isMapSearch = false
}) {
  const mapRef = useRef(null);
  const isProgrammatic = useRef(false);
  const [selectedSalon, setSelectedSalon] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });

  // Sync external hover state through DOM classes
  useEffect(() => {
    const oldHovers = document.querySelectorAll('.salon-pin-base.is-external-hovered');
    oldHovers.forEach(el => {
      el.classList.remove('is-external-hovered');
      if (el.parentNode && !el.matches(':hover')) {
        el.parentNode.style.zIndex = '1';
      }
    });

    if (hoveredSalonId) {
      const newHover = document.querySelector(`.salon-pin-base[data-salon-id="${hoveredSalonId}"]`);
      if (newHover) {
        newHover.classList.add('is-external-hovered');
        if (newHover.parentNode) {
          newHover.parentNode.style.zIndex = '10000';
        }
      }
    }
  }, [hoveredSalonId]);

  // Determine initial center
  const [center, setCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    if (isMapSearch) return; // Do not recalculate center when map is being manually dragged

    if (userLocation?.lat && userLocation?.lng) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      return;
    }
    if (searchLocation?.lat && searchLocation?.lng) {
      setCenter({ lat: searchLocation.lat, lng: searchLocation.lng });
      return;
    }

    const withCoords = salons.filter(s => s.latitude && s.longitude);
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((sum, s) => sum + parseFloat(s.latitude), 0) / withCoords.length;
      const avgLng = withCoords.reduce((sum, s) => sum + parseFloat(s.longitude), 0) / withCoords.length;
      setCenter({ lat: avgLat, lng: avgLng });
    } else {
      setCenter(DEFAULT_CENTER);
    }
  }, [userLocation, searchLocation, salons, isMapSearch]);

  const salonsWithCoords = useMemo(
    () => salons.filter(s => s.latitude && s.longitude).map(s => ({
      ...s,
      __position: { lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) },
      __ratingText: s.rating ? s.rating.toFixed(1) : 'New'
    })),
    [salons]
  );

  const getMarkerOffset = useCallback(() => ({ x: -23, y: -58 }), []);
  const getInfoWindowOffset = useCallback(() => ({ x: -120, y: -280 }), []);

  // onLoad callback: store map ref
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Auto-fit bounds to salon markers
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;

    isProgrammatic.current = true;

    // If we have an explicit user location, pan to it
    if (userLocation?.lat && userLocation?.lng && !isMapSearch) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(13);
      setTimeout(() => { isProgrammatic.current = false; }, 500);
      return;
    }

    if (isMapSearch) {
      isProgrammatic.current = false;
      return; // Don't auto-fit when user is manually panning
    }

    const withCoords = salonsWithCoords;
    if (withCoords.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      withCoords.forEach(s => {
        bounds.extend({ lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (withCoords.length === 1) {
      map.panTo({ lat: parseFloat(withCoords[0].latitude), lng: parseFloat(withCoords[0].longitude) });
      map.setZoom(14);
    }

    setTimeout(() => { isProgrammatic.current = false; }, 500);
  }, [salonsWithCoords, isLoaded, isMapSearch, userLocation]);

  // Handle resize on expand toggle
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      setTimeout(() => {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }, 200);
    }
  }, [isExpanded, isLoaded]);

  // Bounds change handler (Debounced)
  const debounceTimerRef = useRef(null);

  const handleBoundsChanged = useCallback(() => {
    if (!mapRef.current || !onBoundsChange || isProgrammatic.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const bounds = mapRef.current.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      onBoundsChange({
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLng: sw.lng(),
        maxLng: ne.lng(),
      });
    }, 500); // 500ms debounce
  }, [onBoundsChange]);

  /* ── Global CSS for pin animations ───────────────────────────────────── */
  useEffect(() => {
    const styleId = 'salon-map-google-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* ── Pin scale animation (Pure CSS Transitions) ── */
      .salon-pin-base {
        cursor: pointer;
        transform-origin: center bottom;
        transform: translateZ(0) scale(1);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        will-change: transform, filter; /* GPU acceleration hint */
        backface-visibility: hidden; /* Prevent flickering on iOS/Safari */
        -webkit-font-smoothing: antialiased; /* Prevent text jank during scale */
        perspective: 1000px;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease-out;
      }
      
      .salon-pin-base:hover,
      .salon-pin-base.is-external-hovered {
        transform: translateZ(0) scale(1.25);
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
        z-index: 10000 !important;
      }

      .salon-pin-text {
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      .salon-pin-base:hover .salon-pin-text,
      .salon-pin-base.is-external-hovered .salon-pin-text {
        transform: translateY(-4px);
      }

      .salon-star {
        opacity: 0;
        transition: opacity 0.2s ease-out;
      }
      
      .salon-pin-base:hover .salon-star,
      .salon-pin-base.is-external-hovered .salon-star {
        opacity: 1;
        transition-delay: 0.1s;
      }

      /* ── InfoWindow ── */
      .salon-info-window {
        width: 240px;
        background: white;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.06);
        position: relative;
      }

      /* ── InfoWindow arrow ── */
      .salon-info-arrow {
        width: 0; height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-top: 10px solid white;
        margin: 0 auto;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!isLoaded) {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-border/30 w-full h-full min-h-125 flex items-center justify-center bg-muted/30 ${className}`}>
        <div className="animate-pulse text-muted-foreground text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/30 w-full h-full min-h-125 ${className}`}>
      <div className="w-full h-full">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={DEFAULT_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onDragEnd={handleBoundsChanged}
          onZoomChanged={handleBoundsChanged}
          onClick={() => setSelectedSalon(null)}
        >
          {/* Salon markers */}
          {salonsWithCoords.map(salon => {
            return (
              <OverlayViewF
                key={salon.id}
                position={salon.__position}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={getMarkerOffset}
              >
                <SalonPin
                  salon={salon}
                  ratingText={salon.__ratingText}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSalon(salon);

                    if (mapRef.current) {
                      isProgrammatic.current = true;
                      mapRef.current.panTo(salon.__position);

                      // Pan the map camera up by 150px (pushes pin down) to leave room for the tall popup
                      setTimeout(() => {
                        if (mapRef.current) {
                          mapRef.current.panBy(0, -150);
                        }

                        // Release programmatic lock after animation completes
                        setTimeout(() => {
                          isProgrammatic.current = false;
                        }, 500);
                      }, 50);
                    }
                  }}
                />
              </OverlayViewF>
            );
          })}

          {/* InfoWindow for selected salon */}
          {selectedSalon && (
            <OverlayViewF
              position={selectedSalon.__position || { lat: parseFloat(selectedSalon.latitude), lng: parseFloat(selectedSalon.longitude) }}
              mapPaneName={OverlayView.FLOAT_PANE}
              getPixelPositionOffset={getInfoWindowOffset}
              preventMapHitsAndGestures={true}
            >
              <div>
                <SalonInfoWindow
                  salon={selectedSalon}
                  ratingText={selectedSalon.rating ? selectedSalon.rating.toFixed(1) : 'New'}
                  onClose={() => setSelectedSalon(null)}
                />
                <div className="salon-info-arrow" />
              </div>
            </OverlayViewF>
          )}
        </GoogleMap>
      </div>

      {/* Expand/Shrink Toggle */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center hover:shadow-lg transition-all border border-black/5"
          onClick={onToggleExpand}
          title={isExpanded ? "Shrink map" : "Expand map"}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4 text-gray-700" strokeWidth={2.5} />
          ) : (
            <Maximize2 className="h-4 w-4 text-gray-700" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Salon count badge */}
      <div className="absolute bottom-3 left-3 z-[1000]">
        <div className="bg-white/90 backdrop-blur-md rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-md border border-black/5 text-gray-700">
          📍 {salonsWithCoords.length} salons on map
        </div>
      </div>
    </div>
  );
}
