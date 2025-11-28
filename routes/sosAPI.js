const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = twilio(accountSid, authToken);

// Emergency contacts (later store in DB)
const emergencyContacts = [
  "+917620657627"
];
const policeNumber = "+9145650723";

// POST /sos/trigger
router.post('/trigger', async (req, res) => {
  try {
    const { userId, lat, lon, reason } = req.body;

    const messageText = `
🚨 SOS ALERT 🚨
UserID: ${userId}
Location: https://maps.google.com/?q=${lat},${lon}
Reason: ${reason || "Not specified"}
`;

    // 1. Send SMS to all emergency contacts
    for (let number of emergencyContacts) {
      await client.messages.create({
        body: messageText,
        from: process.env.TWILIO_PHONE,
        to: number
      });
    }

    // 2. Send SMS to police
    await client.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE,
      to: policeNumber
    });

    // 3. Emit socket alert
    const io = req.app.locals.io;
    if (io) io.emit("sos-alert", { userId, lat, lon, reason });

    return res.json({ status: "ok", message: "SOS sent successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SOS failed", detail: err.message });
  }
});

module.exports = router;
