'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ───────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ─────────────────────────────────────────────────────────────────────────── */
const DEFAULT_CENTER = [48.8566, 2.3522];
const DEFAULT_ZOOM = 12;

/* ───────────────────────────────────────────────────────────────────────────
   Custom marker: dark teardrop pin with rating + star
   ─────────────────────────────────────────────────────────────────────────── */
function createStaticRatingIcon(rating, salonId) {
  return L.divIcon({
    className: 'salon-marker-custom',
    html: `
      <div class="salon-pin-base" data-salon-id="${salonId}" style="-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <svg viewBox="-2 -2 46 59" width="46" height="59" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
          <path d="M21 54 C21 54 42 33 42 21 C42 9.4 32.6 0 21 0 C9.4 0 0 9.4 0 21 C0 33 21 54 21 54Z" fill="#2d2d2d" stroke="white" stroke-width="2.5" stroke-linejoin="round" />
          <text class="salon-pin-text" x="21" y="24" text-anchor="middle" fill="white" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" dominant-baseline="central">${rating}</text>
          <text class="salon-star" x="21" y="35" text-anchor="middle" fill="#ffc00a" font-size="11" dominant-baseline="central" opacity="0">★</text>
        </svg>
      </div>
    `,
    iconSize: [46, 59],
    iconAnchor: [23, 58],
    popupAnchor: [0, -60],
  });
}

const iconCache = new Map();

function getCachedStaticIcon(rating, salonId) {
  const key = `salon-${salonId}-${rating}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, createStaticRatingIcon(rating, salonId));
  }
  return iconCache.get(key);
}

/* ───────────────────────────────────────────────────────────────────────────
   Auto-fit bounds to salon markers
   ─────────────────────────────────────────────────────────────────────────── */
function FitBounds({ salons, isMapSearch, userLocation }) {
  const map = useMap();

  useEffect(() => {
    // If we have an explicit user location (e.g. from "Current location" button), fly to it and don't auto-fit bounds
    if (userLocation?.lat && userLocation?.lng && !isMapSearch) {
      map.flyTo([userLocation.lat, userLocation.lng], 13);
      return;
    }

    if (isMapSearch) return; // Disable auto-fit if user is manually searching the map area
    const withCoords = salons.filter(s => s.latitude && s.longitude);
    if (withCoords.length > 1) {
      const bounds = L.latLngBounds(
        withCoords.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (withCoords.length === 1) {
      map.flyTo(
        [parseFloat(withCoords[0].latitude), parseFloat(withCoords[0].longitude)],
        14
      );
    }
  }, [salons, map, isMapSearch, userLocation]);

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
   Event listener for map user interactions
   ─────────────────────────────────────────────────────────────────────────── */
function MapEventsBounds({ onBoundsChange }) {
  const map = useMap();
  useEffect(() => {
    if (!onBoundsChange) return;
    
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast()
      });
    };
    
    map.on('dragend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('dragend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
   SALON MAP COMPONENT
   ─────────────────────────────────────────────────────────────────────────── */
export function SalonMap({ 
  salons = [], 
  userLocation = null, 
  searchLocation = null, 
  className = '', 
  isExpanded = false, 
  onToggleExpand = () => {},
  hoveredSalonId = null,
  onBoundsChange = null,
  isMapSearch = false
}) {
  const mapRef = useRef(null);

  // Sync external hover state strictly through DOM classes to avoid Leaflet re-rendering icons
  useEffect(() => {
    // Clear old hovers
    const oldHovers = document.querySelectorAll('.salon-pin-base.is-external-hovered');
    oldHovers.forEach(el => el.classList.remove('is-external-hovered'));

    // Apply new hover
    if (hoveredSalonId) {
      const newHover = document.querySelector(`.salon-pin-base[data-salon-id="${hoveredSalonId}"]`);
      if (newHover) {
        newHover.classList.add('is-external-hovered');
      }
    }
  }, [hoveredSalonId]);

  // Determine initial center
  const center = useMemo(() => {
    if (userLocation?.lat && userLocation?.lng) return [userLocation.lat, userLocation.lng];
    if (searchLocation?.lat && searchLocation?.lng) return [searchLocation.lat, searchLocation.lng];
    const withCoords = salons.filter(s => s.latitude && s.longitude);
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((sum, s) => sum + parseFloat(s.latitude), 0) / withCoords.length;
      const avgLng = withCoords.reduce((sum, s) => sum + parseFloat(s.longitude), 0) / withCoords.length;
      return [avgLat, avgLng];
    }
    return DEFAULT_CENTER;
  }, [userLocation, searchLocation, salons]);

  const salonsWithCoords = useMemo(
    () => salons.filter(s => s.latitude && s.longitude),
    [salons]
  );

  // Handle resize on expand toggle
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 200);
    }
  }, [isExpanded]);

  /* ── Global CSS overrides for Leaflet popups ─────────────────────────── */
  useEffect(() => {
    const styleId = 'salon-map-leaflet-styles';
    // Always replace to ensure updates take effect on HMR
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .salon-marker-custom { background: none !important; border: none !important; }

      /* ── Pin scale animation (Pure CSS Transitions) ── */
      .salon-pin-base {
        cursor: pointer;
        transform-origin: center bottom;
        transform: translateZ(0) scale(1);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        will-change: transform, filter;
        backface-visibility: hidden;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease-out;
      }
      
      .salon-pin-base:hover,
      .salon-pin-base.is-external-hovered {
        transform: translateZ(0) scale(1.25);
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
      }

      .leaflet-marker-icon:has(.salon-pin-base:hover),
      .leaflet-marker-icon:has(.salon-pin-base.is-external-hovered) {
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

      .salon-popup .leaflet-popup-content-wrapper {
        border-radius: 14px !important;
        padding: 0 !important;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06) !important;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.06);
      }
      .salon-popup .leaflet-popup-content { margin: 0 !important; width: 240px !important; }
      .salon-popup .leaflet-popup-tip { 
        box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        border: 1px solid rgba(0,0,0,0.04);
      }
      .leaflet-control-attribution {
        font-size: 9px !important;
        background: rgba(255,255,255,0.7) !important;
        padding: 2px 6px !important;
        border-radius: 4px 0 0 0 !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  /* ── Map render ────────────────────────────────────────────────────── */
  const mapContent = (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      style={{ minHeight: '100%', background: '#f5f5f0' }}
      ref={mapRef}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <ZoomControl position="bottomright" />

      <FitBounds salons={salonsWithCoords} isMapSearch={isMapSearch} userLocation={userLocation} />
      <MapEventsBounds onBoundsChange={onBoundsChange} />

      {salonsWithCoords.map(salon => {
        const ratingText = salon.rating ? salon.rating.toFixed(1) : 'New';

        return (
          <Marker
            key={salon.id}
            position={[parseFloat(salon.latitude), parseFloat(salon.longitude)]}
            icon={getCachedStaticIcon(ratingText, salon.id)}
          >
            <Popup className="salon-popup" closeButton={false} autoPan={true} autoPanPadding={[20, 20]}>
              <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                {/* Image */}
                <div style={{
                  height: 100,
                  background: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #fbcfe8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {salon.cover_image_url ? (
                    <img
                      src={salon.cover_image_url}
                      alt={salon.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 28 }}>💇</span>
                  )}
                  {/* Rating badge overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}>
                    <span style={{ color: '#ffc00a' }}>★</span>
                    {ratingText}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '10px 14px 12px' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#1a1a1a',
                    marginBottom: 4,
                    lineHeight: 1.3,
                  }}>{salon.name}</div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#6b7280',
                  }}>
                    <span>{salon.category || 'Salon'}</span>
                    {salon.price_level && (
                      <>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          {'$'.repeat(salon.price_level)}
                        </span>
                      </>
                    )}
                  </div>

                  {salon.address && (
                    <div style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      📍 {salon.address}
                    </div>
                  )}

                  {/* CTA */}
                  <a
                    href={`/salon/${salon.id}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      marginTop: 10,
                      padding: '7px 0',
                      background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                      color: '#fff',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    View Salon →
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/30 w-full h-full min-h-125 ${className}`}>
      <div className="w-full h-full">
        {mapContent}
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
