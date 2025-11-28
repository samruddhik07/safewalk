// Handles offline sync payloads (SOS, incident reports) posted by clients when connectivity resumes.
const SOSLog = require('../models/SOSLog');
const Incident = require('../models/Incident');

exports.syncOffline = async (req, res) => {
  try {
    const payload = req.body; // expected shape: { type: 'sos'|'incident', data: {...} }
    if (!payload || !payload.type) return res.status(400).json({ error: 'invalid payload' });

    if (payload.type === 'sos') {
      const d = payload.data;
      const sos = new SOSLog({ userId: d.userId, lat: d.lat, lon: d.lon, reason: d.reason });
      await sos.save();
    } else if (payload.type === 'incident') {
      const d = payload.data;
      const incident = new Incident({ userId: d.userId, lat: d.lat, lon: d.lon, type: d.type, description: d.description });
      await incident.save();
    } else {
      return res.status(400).json({ error: 'unknown type' });
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('syncController.syncOffline', err);
    return res.status(500).json({ error: 'sync failed' });
  }
};