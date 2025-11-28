const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');   // Make sure this path is correct

// ------------------------------------------------------
// POST /incident/report   → Save incident to DB
// ------------------------------------------------------
router.post('/report', async (req, res) => {
  try {
    const { userId, lat, lon, type, description } = req.body;

    if (!lat || !lon || !type) {
      return res.status(400).json({ error: "lat, lon, and type are required" });
    }

    const newIncident = new Incident({
      userId,
      type,
      description,
      verified: false,
      location: {
        type: "Point",
        coordinates: [lon, lat]   // IMPORTANT: [longitude, latitude]
      }
    });

    await newIncident.save();

    return res.json({
      status: "ok",
      incidentId: newIncident._id
    });

  } catch (err) {
    console.error("incidentController.reportIncident", err);
    return res.status(500).json({ error: "report failed" });
  }
});


// ------------------------------------------------------
// GET /incident/nearby?lat=..&lon=..&radius=..
// Fetch incidents near a location using $near
// ------------------------------------------------------
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 500 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "lat & lon required" });
    }

    const incidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    });

    return res.json({ incidents });

  } catch (err) {
    console.error("incidentController.getNearby", err);
    return res.status(500).json({ error: "fetch failed" });
  }
});

module.exports = router;
