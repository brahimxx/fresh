var geocodeCache = new Map();

function toNumber(value) {
  var num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function geocodeAddress(address) {
  var normalized = (address || "").trim();
  if (!normalized) return null;

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized);
  }

  var url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(normalized);

  var response = await fetch(url, {
    headers: {
      "User-Agent": "FreshBooking/1.0",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to geocode address");
  }

  var data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    geocodeCache.set(normalized, null);
    return null;
  }

  var lat = toNumber(data[0].lat);
  var lng = toNumber(data[0].lon);
  if (lat === null || lng === null) {
    geocodeCache.set(normalized, null);
    return null;
  }

  var result = { lat: lat, lng: lng };
  geocodeCache.set(normalized, result);
  return result;
}

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLng = ((lng2 - lng1) * Math.PI) / 180;

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isValidCoordinatePair(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}
