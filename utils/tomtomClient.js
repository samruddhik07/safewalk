const axios = require('axios');
const key = process.env.TOMTOM_KEY;

function simplifyRoute(data) {
  const route = data.routes[0];
  const leg = route.legs[0];

  return {
    points: leg.points.map(p => ({
      lat: p.latitude,
      lon: p.longitude
    })),
    distance: route.summary.lengthInMeters,
    duration: route.summary.travelTimeInSeconds,
    generatedAt: Date.now()
  };
}

async function calculateRoute(start, end) {
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lon}:${end.lat},${end.lon}/json?key=${key}`;
  const res = await axios.get(url);

  return simplifyRoute(res.data);
}

module.exports = { calculateRoute };
