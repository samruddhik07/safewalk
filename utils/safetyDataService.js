// utils/safetyDataService.js
const fs = require('fs');
const path = require('path');
const { computeSafetyScore } = require('./safetyScore');

// Read file and normalize like safetyScore does (so same shape)
const rawPath = path.join(__dirname, '../dataset/safetyData.json');
let raw = null;
try {
  raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
} catch (e) {
  console.error('Failed to read dataset/safetyData.json:', e.message);
  raw = null;
}

function normalizeAreas(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.areas)) return data.areas;
  if (data.areas && typeof data.areas === 'object') return Object.values(data.areas);
  if (typeof data === 'object') return Object.values(data);
  return [];
}

const safetyAreas = normalizeAreas(raw);

// helper to get coords from area
function getAreaCoords(area) {
  if (!area) return null;
  if (Array.isArray(area.coordinates) && area.coordinates.length >= 2) return { lat: Number(area.coordinates[0]), lon: Number(area.coordinates[1]) };
  if (area.lat !== undefined && area.lon !== undefined) return { lat: Number(area.lat), lon: Number(area.lon) };
  if (area.latitude !== undefined && area.longitude !== undefined) return { lat: Number(area.latitude), lon: Number(area.longitude) };
  return null;
}

function findNearestSafetyData(lat, lon) {
  let best = null;
  let minDist = Infinity;

  for (const zone of safetyAreas) {
    const coords = getAreaCoords(zone);
    if (!coords) continue;
    const dist = Math.sqrt((lat - coords.lat) ** 2 + (lon - coords.lon) ** 2);
    if (dist < minDist) {
      minDist = dist;
      best = zone;
    }
  }
  return best;
}

function computeSafetyForRoute(route) {
  if (!route || !Array.isArray(route.points) || route.points.length === 0) return 50;

  let total = 0, count = 0;

  for (const p of route.points) {
    const plat = p.lat ?? p.latitude;
    const plon = p.lon ?? p.longitude;
    if (plat == null || plon == null) continue;

    const zone = findNearestSafetyData(Number(plat), Number(plon));
    if (!zone) continue;

    // computeSafetyScore expects simplified route; you pass route and zone indirectly (score uses zone via file)
    const score = computeSafetyScore(route);
    total += score;
    count++;
  }

  return count > 0 ? Math.round(total / count) : 50;
}

module.exports = { computeSafetyForRoute };
