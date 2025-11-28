const tomtom = require('../utils/tomtomClient');
const { computeSafetyScore } = require('../utils/safetyScore');
const axios = require('axios');

// Compute safe route using tomtom client + simple safety scoring
exports.getSafeRoute = async (req, res) => {
  try {
    const { start, end, persona } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'start and end required' });

    // calculate route via tomtom client util
    const routeData = await tomtom.calculateRoute(start, end);
    const route = routeData.routes?.[0] || null;

    // compute a basic safety score (replace with ML call if available)
    const safetyScore = computeSafetyScore(route, { lighting: 'unknown', cctv: 0 });

    // build tilesToCache hint for client (client can compute exact list too)
    const tilesToCache = []; // for MVP, left empty

    return res.json({
      bestRouteId: `route-${Date.now()}`,
      routes: route ? [route] : [],
      safetyMeta: { score: safetyScore, reason: 'rule-based score' },
      tilesToCache
    });
  } catch (err) {
    console.error('routesController.getSafeRoute', err.message);
    return res.status(500).json({ error: 'failed to compute route' });
  }
};

exports.getRouteHistory = async (req, res) => {
  // For MVP, returns empty list or mock. Later: query DB for route history by user.
  res.json({ history: [] });
};