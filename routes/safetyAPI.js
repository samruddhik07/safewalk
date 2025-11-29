const express = require('express');
const router = express.Router();
const { calculateZoneScore, dummyDataArr } = require('../utils/safetyScore');

// GET /safety/heatmap
router.get('/heatmap', (req, res) => {
    try {
        // Calculate score for every item in your JSON dataset
        const scoredZones = dummyDataArr.map(zone => {
            return {
                locationId: zone.locationId || "Unknown",
                lat: zone.lat,
                lon: zone.lon,
                lighting: zone.lighting,
                cctvCount: zone.cctvCount,
                crimeIndex: zone.crimeIndex,
                // 🔥 CALCULATE SCORE HERE
                safetyScore: calculateZoneScore(zone) 
            };
        });

        res.json({ zones: scoredZones });
    } catch (err) {
        console.error("Heatmap Error:", err);
        res.status(500).json({ error: "Failed to generate heatmap" });
    }
});

module.exports = router;