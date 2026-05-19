/**
 * travel.js — Travel time estimation utilities for mobile service scheduling.
 *
 * Uses straight-line (Haversine) distance × 1.4 road correction factor at
 * 30 km/h average speed, plus a fixed setup buffer. A routing API can be
 * swapped in later by replacing `calculateTravelTimeMinutes()` alone.
 *
 * Validation is BIDIRECTIONAL:
 *   - Arrival: prev_end + travel(prev → new) <= new_start
 *   - Departure: new_end + travel(new → next) <= next_start
 */

import { haversineDistanceKm, isValidCoordinatePair } from "@/lib/geo";

// ── Constants ──────────────────────────────────────────────────────────────

/** Road vs straight-line correction factor (empirical urban average). */
export const ROAD_CORRECTION_FACTOR = 1.4;

/** Assumed average travel speed in km/h for time estimation. */
export const AVERAGE_SPEED_KMH = 30;

/**
 * Fixed setup/delay buffer added on top of raw travel time (minutes).
 * Accounts for parking, setup, introductions — NOT a substitute for travel.
 */
export const SETUP_BUFFER_MINUTES = 10;

// ── Core travel time functions ─────────────────────────────────────────────

/**
 * Estimate travel time between two geographic points.
 * Returns 0 if coordinates are invalid (safe fallback, no false blocks).
 *
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @returns {number} Estimated travel time in minutes (rounded up), excluding setup buffer.
 */
export function calculateTravelTimeMinutes(fromLat, fromLng, toLat, toLng) {
  if (
    !isValidCoordinatePair(fromLat, fromLng) ||
    !isValidCoordinatePair(toLat, toLng)
  ) {
    return 0;
  }
  const straightLineKm = haversineDistanceKm(fromLat, fromLng, toLat, toLng);
  return estimateTravelTimeFromDistance(straightLineKm);
}

/**
 * Estimate raw travel time from a pre-computed Haversine distance.
 * Does NOT include the setup buffer — callers must add SETUP_BUFFER_MINUTES.
 *
 * @param {number} distanceKm  Straight-line distance in km.
 * @returns {number}           Raw travel time in minutes (rounded up).
 */
export function estimateTravelTimeFromDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const roadDistanceKm = distanceKm * ROAD_CORRECTION_FACTOR;
  const rawMinutes = (roadDistanceKm / AVERAGE_SPEED_KMH) * 60;
  return Math.ceil(rawMinutes);
}

/**
 * Total time required to travel between two points INCLUDING setup buffer.
 * Use this for all feasibility gap comparisons.
 *
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @returns {number} travel_time + SETUP_BUFFER_MINUTES
 */
export function totalTimeRequired(fromLat, fromLng, toLat, toLng, salonBufferTime) {
  const activeBuffer = salonBufferTime ?? SETUP_BUFFER_MINUTES;
  return calculateTravelTimeMinutes(fromLat, fromLng, toLat, toLng) + activeBuffer;
}

// ── Location resolution helper ─────────────────────────────────────────────

/**
 * Resolve the best available origin coordinates.
 *
 * Priority: booking location (mobile) → staff home → salon center → null.
 *
 * @param {number|null} bookingLat
 * @param {number|null} bookingLng
 * @param {number|null} baseLat  staff.home_lat or salon.latitude
 * @param {number|null} baseLng  staff.home_lng or salon.longitude
 * @returns {{ lat: number, lng: number } | null}
 */
export function resolveOrigin(bookingLat, bookingLng, baseLat, baseLng) {
  if (bookingLat != null && bookingLng != null && isValidCoordinatePair(Number(bookingLat), Number(bookingLng))) {
    return { lat: Number(bookingLat), lng: Number(bookingLng) };
  }
  if (baseLat != null && baseLng != null && isValidCoordinatePair(Number(baseLat), Number(baseLng))) {
    return { lat: Number(baseLat), lng: Number(baseLng) };
  }
  return null;
}

// ── Bidirectional feasibility check ───────────────────────────────────────

/**
 * Check whether a new mobile booking slot is feasible for a staff member
 * in BOTH directions:
 *
 *   ARRIVAL:   prev_end + travel(prev→new) + buffer <= new_start
 *   DEPARTURE: new_end  + travel(new→next) + buffer <= next_start
 *
 * A direction is skipped (treated as feasible) when there is no adjacent
 * booking or when coordinates cannot be resolved — to avoid false blocks.
 *
 * @param {object} opts
 * @param {number|null} opts.prevLat         Location of previous booking (null if physical/unknown)
 * @param {number|null} opts.prevLng
 * @param {Date|null}   opts.prevEndTime     End of previous booking (null = no prior booking)
 * @param {number}      opts.newLat          Client location for new booking
 * @param {number}      opts.newLng
 * @param {Date}        opts.newStartTime    Start of new booking
 * @param {Date}        opts.newEndTime      End of new booking
 * @param {number|null} opts.nextLat         Location of next booking (null if physical/unknown)
 * @param {number|null} opts.nextLng
 * @param {Date|null}   opts.nextStartTime   Start of next booking (null = no next booking)
 * @param {number|null} opts.baseLat         Staff home lat (fallback origin/destination)
 * @param {number|null} opts.baseLng         Staff home lng (fallback origin/destination)
 *
 * @returns {{
 *   feasible: boolean,
 *   arrivalFeasible: boolean,
 *   departureFeasible: boolean,
 *   arrivalTravelMinutes: number,
 *   departureTravelMinutes: number,
 *   arrivalGapMinutes: number,
 *   departureGapMinutes: number,
 * }}
 */
export function checkBidirectionalTravel({
  prevLat,
  prevLng,
  prevEndTime,
  newLat,
  newLng,
  newStartTime,
  newEndTime,
  nextLat,
  nextLng,
  nextStartTime,
  baseLat,
  baseLng,
  salonBufferTime,
}) {
  const result = {
    feasible: true,
    arrivalFeasible: true,
    departureFeasible: true,
    arrivalTravelMinutes: 0,
    departureTravelMinutes: 0,
    arrivalGapMinutes: Infinity,
    departureGapMinutes: Infinity,
  };

  // ── Arrival check ────────────────────────────────────────────────────────
  if (prevEndTime) {
    // Resolve where the staff is coming FROM: prev booking location → base → unknown
    const origin = resolveOrigin(prevLat, prevLng, baseLat, baseLng);

    if (origin) {
      const travelMins = calculateTravelTimeMinutes(origin.lat, origin.lng, Number(newLat), Number(newLng));
      const activeBuffer = salonBufferTime ?? SETUP_BUFFER_MINUTES;
      const requiredMins = travelMins + activeBuffer;
      const gapMs = new Date(newStartTime).getTime() - new Date(prevEndTime).getTime();
      const gapMinutes = gapMs / 60000;

      result.arrivalTravelMinutes = requiredMins;
      result.arrivalGapMinutes = gapMinutes;
      result.arrivalFeasible = gapMinutes >= requiredMins;
    }
    // If origin is null, we cannot validate — treat as feasible (no false blocks).
  }

  // ── Departure check ──────────────────────────────────────────────────────
  if (nextStartTime) {
    // Resolve where staff needs to GO TO: next booking location → base → unknown
    const destination = resolveOrigin(nextLat, nextLng, baseLat, baseLng);

    if (destination) {
      const travelMins = calculateTravelTimeMinutes(Number(newLat), Number(newLng), destination.lat, destination.lng);
      const activeBuffer = salonBufferTime ?? SETUP_BUFFER_MINUTES;
      const requiredMins = travelMins + activeBuffer;
      const gapMs = new Date(nextStartTime).getTime() - new Date(newEndTime).getTime();
      const gapMinutes = gapMs / 60000;

      result.departureTravelMinutes = requiredMins;
      result.departureGapMinutes = gapMinutes;
      result.departureFeasible = gapMinutes >= requiredMins;
    }
    // If destination is null, we cannot validate — treat as feasible.
  }

  result.feasible = result.arrivalFeasible && result.departureFeasible;
  return result;
}

/**
 * @deprecated Use checkBidirectionalTravel() instead.
 * Kept for backward compatibility with any external callers.
 */
export function isTravelFeasible({
  prevLat, prevLng, prevEndTime,
  newLat, newLng, newStartTime,
  baseLat, baseLng, salonBufferTime
}) {
  const r = checkBidirectionalTravel({
    prevLat, prevLng, prevEndTime,
    newLat, newLng,
    newStartTime,
    newEndTime: newStartTime, // departure check skipped — no nextStartTime
    nextStartTime: null,
    baseLat, baseLng,
    salonBufferTime,
  });
  return {
    feasible: r.arrivalFeasible,
    travelMinutes: r.arrivalTravelMinutes,
    gapMinutes: r.arrivalGapMinutes,
  };
}
