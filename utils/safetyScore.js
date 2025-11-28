// utils/safetyScore.js
const raw = require('../dataset/safetyData.json');

// Normalize dataset into an array of area objects
function normalizeAreas(data) {
  if (!data) return [];
  // case A: top-level array
  if (Array.isArray(data)) return data;
  // case B: { areas: [ ... ] }
  if (Array.isArray(data.areas)) return data.areas;
  // case C: { areas: { key1: {...}, key2: {...} } }
  if (data.areas && typeof data.areas === 'object') return Object.values(data.areas);
  // fallback: try values of root object
  if (typeof data === 'object') return Object.values(data);
  return [];
}

const dummyDataArr = normalizeAreas(raw);

// helper: find nearest area robust to different coordinate names
function areaCoordinates(area) {
  // support coordinates array [lat, lon] or lat/lon fields
  if (Array.isArray(area.coordinates) && area.coordinates.length >= 2) {
    return { lat: Number(area.coordinates[0]), lon: Number(area.coordinates[1]) };
  }
  // support { lat, lon } fields
  if (area.lat !== undefined && area.lon !== undefined) {
    return { lat: Number(area.lat), lon: Number(area.lon) };
  }
  // support other common names
  if (area.latitude !== undefined && area.longitude !== undefined) {
    return { lat: Number(area.latitude), lon: Number(area.longitude) };
  }
  // no coords
  return null;
}

function getNearestArea(point) {
  if (!point) return null;
  let best = null;
  let minDist = Infinity;

  for (const area of dummyDataArr) {
    const coords = areaCoordinates(area);
    if (!coords) continue;
    const dx = point.lat - coords.lat;
    const dy = point.lon - coords.lon;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      best = area;
    }
  }
  return best;
}

function computeSafetyScore(route) {
  let score = 50;

  // 1️⃣ BASIC DISTANCE FACTOR (from simplified route)
  if (route?.distance) {
    const len = route.distance;
    if (len < 2000) score += 10;
    else if (len < 5000) score += 5;
  }

  // 2️⃣ GET MIDPOINT OF ROUTE
  if (!route || !Array.isArray(route.points) || route.points.length === 0) return score;

  const mid = route.points[Math.floor(route.points.length / 2)];
  // support point fields naming
  const midPoint = { lat: mid.lat ?? mid.latitude ?? mid.latitudeInDegrees ?? null,
                     lon: mid.lon ?? mid.longitude ?? mid.longitudeInDegrees ?? null };

  if (midPoint.lat == null || midPoint.lon == null) return score;

  const area = getNearestArea(midPoint);
  if (!area) return score;

  // 3️⃣ FEATURES FROM DUMMY DATA (defensive defaults)
  const lighting = Number(area.lighting ?? area.lightingScore ?? 3);
  const cctvCount = Number(area.cctvCount ?? area.cctv ?? 0);
  const crimeIndex = Number(area.crimeIndex ?? area.predicted_crimeIndex ?? area.risk ?? 0.5);
  const crowdDensity = Number(area.crowdDensity ?? area.crowd ?? 0.5);
  const policeDistance = Number(area.policeDistance ?? area.policeDistanceKm ?? 2);
  const hospitalDistance = Number(area.hospitalDistance ?? area.hospitalDistanceKm ?? 2);

  // 💡 Lighting (0–5)
  score += lighting * 2;

  // 📷 CCTV
  if (cctvCount > 10) score += 10;
  else if (cctvCount > 5) score += 5;

  // 🚨 Crime index (0 = safest)
  score -= crimeIndex * 20;

  // 👥 Crowd density (0–1)
  score += crowdDensity * 5;

  // 🚓 Police nearby
  if (policeDistance < 0.5) score += 5;

  // 🏥 Hospital nearby
  if (hospitalDistance < 1) score += 3;

  return Math.max(0, Math.min(score, 100));
}

module.exports = { computeSafetyScore };
