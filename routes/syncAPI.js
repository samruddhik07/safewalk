const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident'); // 1. Import the Model

// ------------------------------------------------------
// POST /sync/offline
// Called by Frontend when internet comes back
// ------------------------------------------------------
router.post('/offline', async (req, res) => {
  try {
    // 2. Expecting a list of incidents from frontend
    // Body should look like: { incidents: [ { lat:..., lon:..., type:... }, ... ] }
    const { incidents } = req.body; 

    console.log(`🔄 Received ${incidents ? incidents.length : 0} offline reports for syncing...`);

    if (!incidents || !Array.isArray(incidents)) {
      return res.status(400).json({ error: 'Invalid payload. Expected array of incidents.' });
    }

    let savedCount = 0;

    // 3. Loop through every offline report and save to MongoDB
    for (const item of incidents) {
      
      // Validation: Skip bad data
      if (!item.lat || !item.lon || !item.type) continue;

      const newIncident = new Incident({
        userId: item.userId || "offline-user", // Fallback if user ID missing
        type: item.type,
        description: item.description || item.note || "Reported while offline",
        verified: false,
        timestamp: item.timestamp || new Date(),
        location: {
          type: "Point",
        
          coordinates: [parseFloat(item.lon), parseFloat(item.lat)] 
        }
      });

      await newIncident.save();
      savedCount++;
    }

    console.log(`✅ Successfully saved ${savedCount} incidents to DB.`);
    
    return res.json({ 
      status: 'ok', 
      synced: savedCount,
      message: 'Offline data synced successfully' 
    });

  } catch (err) {
    console.error("❌ Sync Error:", err);
    return res.status(500).json({ error: 'Sync failed on server' });
  }
});

// ------------------------------------------------------
// GET /sync/pending 
// (Optional: If you want to see what needs syncing)
// ------------------------------------------------------
router.get('/pending', async (req, res) => {
 
  res.json({ status: "ok", message: "Sync logic is handled client-side" });
});

module.exports = router;