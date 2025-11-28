const express = require('express');
const router = express.Router();

router.post('/offline', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received offline sync payload:', payload);
    // TODO: persist to DB or process as needed
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'sync failed' });
  }
});

router.get('/pending', async (req, res) => {
  // TODO: return pending offline records if stored server-side
  res.json({ pending: [] });
});

module.exports = router;