const raw = require('../dataset/safetyData.json');

// Normalize dataset
function normalizeAreas(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.areas)) return data.areas;
  if (data.areas && typeof data.areas === 'object') return Object.values(data.areas);
  if (typeof data === 'object') return Object.values(data);
  return [];
}

const dummyDataArr = normalizeAreas(raw);

// Helper: Find nearest area
function areaCoordinates(area) {
  if (Array.isArray(area.coordinates) && area.coordinates.length >= 2) {
    return { lat: Number(area.coordinates[0]), lon: Number(area.coordinates[1]) };
  }
  if (area.lat !== undefined && area.lon !== undefined) {
    return { lat: Number(area.lat), lon: Number(area.lon) };
  }
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

// 🆕 NEW: Independent Function to calculate score for ONE zone
function calculateZoneScore(area) {
  let score = 50; // Base score

  // Extract features (same logic you had before)
  const lighting = Number(area.lighting ?? area.lightingScore ?? 3);
  const cctvCount = Number(area.cctvCount ?? area.cctv ?? 0);
  const crimeIndex = Number(area.crimeIndex ?? area.predicted_crimeIndex ?? 0.5);
  const crowdDensity = Number(area.crowdDensity ?? 0.5);
  const policeDistance = Number(area.policeDistance ?? 2);
  const hospitalDistance = Number(area.hospitalDistance ?? 2);

  // 💡 Lighting (0–5) -> Max +10
  score += lighting * 2;

  // 📷 CCTV -> Max +10
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

// Your existing Route function (now uses the helper above)
function computeSafetyScore(route) {
  let score = 50;

  // 1️⃣ BASIC DISTANCE FACTOR
  if (route?.distance) {
    const len = route.distance;
    if (len < 2000) score += 10;
    else if (len < 5000) score += 5;
  }

  // 2️⃣ GET MIDPOINT
  if (!route || !Array.isArray(route.points) || route.points.length === 0) return score;

  const mid = route.points[Math.floor(route.points.length / 2)];
  const midPoint = { lat: mid.lat ?? mid.latitude, lon: mid.lon ?? mid.longitude };

  if (midPoint.lat == null || midPoint.lon == null) return score;

  const area = getNearestArea(midPoint);
  if (!area) return score;

  // 3️⃣ Use the new helper function to get zone score
  const zoneScore = calculateZoneScore(area);
  
  // Combine route score + zone score (Averaging them roughly)
  return Math.max(0, Math.min(score + (zoneScore - 50), 100));
}

// Export both functions
module.exports = { computeSafetyScore, calculateZoneScore, dummyDataArr };