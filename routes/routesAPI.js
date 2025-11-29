
const express = require('express');
const { calculateRoute } = require('../utils/tomtomClient');
const { computeSafetyScore } = require('../utils/safetyScore');

const router = express.Router();

router.post('/safe', async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end required' });
    }

    // 1️⃣ Get simplified route from TomTom client
    const route = await calculateRoute(start, end);

    // 2️⃣ Compute safety score (⚠️ ADDED await HERE)
    const score = await computeSafetyScore(route);

    // 3️⃣ Send final response
    res.json({
      bestRouteId: `route-${Date.now()}`,
      route,
      safetyMeta: { score }, // Now this will be a number, not a Promise
      tilesToCache: []
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({
      error: 'Route calculation failed',
      detail: err.message
    });
  }
});

module.exports = router;