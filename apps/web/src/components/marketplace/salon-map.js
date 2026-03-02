'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
function createRatingIcon(rating, pinClass = 'salon-pin-default') {
  const isHovered = pinClass === 'salon-pin-hovered';

  return L.divIcon({
    className: 'salon-marker-custom',
    html: `
      <div class="${pinClass}">
        <svg viewBox="0 0 42 55" width="42" height="55" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 54 C21 54 42 33 42 21 C42 9.4 32.6 0 21 0 C9.4 0 0 9.4 0 21 C0 33 21 54 21 54Z" fill="#2d2d2d"/>
          <text x="21" y="${isHovered ? '20' : '24'}" text-anchor="middle" fill="white" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" dominant-baseline="central">${rating}</text>
          <text x="21" y="35" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="11" dominant-baseline="central" class="${isHovered ? 'salon-star-reveal' : ''}" opacity="0">★</text>
        </svg>
      </div>
    `,
    iconSize: [42, 55],
    iconAnchor: [21, 55],
    popupAnchor: [0, -57],
  });
}

/* ───────────────────────────────────────────────────────────────────────────
   Auto-fit bounds to salon markers
   ─────────────────────────────────────────────────────────────────────────── */
function FitBounds({ salons }) {
  const map = useMap();

  useEffect(() => {
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
  }, [salons, map]);

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
   SALON MAP COMPONENT
   ─────────────────────────────────────────────────────────────────────────── */
export function SalonMap({ salons = [], userLocation = null, searchLocation = null, className = '', isExpanded = false, onToggleExpand = () => {} }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const leaveTimerRef = useRef(null);
  const mapRef = useRef(null);

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

      /* ── Pin scale animation (keyframes because Leaflet replaces the DOM) ── */
      @keyframes pinScaleUp {
        0%   { transform: scale(1);    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
        100% { transform: scale(1.25); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35)); }
      }
      @keyframes pinScaleDown {
        0%   { transform: scale(1.25); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35)); }
        100% { transform: scale(1);    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
      }
      .salon-pin-default {
        cursor: pointer;
        transform-origin: center bottom;
        transform: scale(1);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      .salon-pin-leaving {
        cursor: pointer;
        transform-origin: center bottom;
        animation: pinScaleDown 0.3s ease-out forwards;
      }
      .salon-pin-hovered {
        cursor: pointer;
        transform-origin: center bottom;
        animation: pinScaleUp 0.3s ease-out forwards;
      }

      /* ── Star fade-in AFTER scale finishes (250ms delay) ──────────── */
      @keyframes starReveal {
        0%   { opacity: 0; }
        100% { opacity: 1; }
      }
      .salon-star-reveal {
        animation: starReveal 0.2s ease-out 0.25s both;
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

      <FitBounds salons={salonsWithCoords} />

      {salonsWithCoords.map(salon => {
        const isHovered = hoveredId === salon.id;
        const isLeaving = leavingId === salon.id;
        const pinClass = isHovered ? 'salon-pin-hovered' : isLeaving ? 'salon-pin-leaving' : 'salon-pin-default';
        const ratingText = salon.rating ? salon.rating.toFixed(1) : 'New';

        return (
          <Marker
            key={salon.id}
            position={[parseFloat(salon.latitude), parseFloat(salon.longitude)]}
            icon={createRatingIcon(ratingText, pinClass)}
            zIndexOffset={isHovered ? 1000 : 0}
            eventHandlers={{
              mouseover: () => {
                if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                setLeavingId(null);
                setHoveredId(salon.id);
              },
              mouseout: () => {
                setHoveredId(null);
                setLeavingId(salon.id);
                leaveTimerRef.current = setTimeout(() => setLeavingId(null), 350);
              },
            }}
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
                    <span style={{ color: '#fbbf24' }}>★</span>
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
