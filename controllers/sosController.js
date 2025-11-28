const SOSLog = require('../models/SOSLog');

exports.triggerSOS = async (req, res) => {
  try {
    const { userId, lat, lon, reason } = req.body;
    const sos = new SOSLog({ userId, lat, lon, reason, resolved: false });
    await sos.save();

    // emit via socket.io if available
    const io = req.app.locals.io;
    if (io) {
      io.emit('sos-alert', { id: sos._id, userId, lat, lon, reason, time: Date.now() });
    }

    // TODO: trigger Twilio notifications to guardians

    return res.json({ status: 'ok', sosId: sos._id });
  } catch (err) {
    console.error('sosController.triggerSOS', err);
    return res.status(500).json({ error: 'sos failed' });
  }
};

exports.getActiveSOS = async (req, res) => {
  try {
    const active = await SOSLog.find({ resolved: false }).sort({ createdAt: -1 }).limit(50);
    return res.json({ active });
  } catch (err) {
    console.error('sosController.getActiveSOS', err);
    return res.status(500).json({ error: 'fetch failed' });
  }
};