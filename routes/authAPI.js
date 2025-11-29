const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'missing fields' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'email exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash });
    await user.save();
    res.json({ status: 'ok', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'register failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid creds' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid creds' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ status: 'ok', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'login failed' });
  }
});

router.get('/me', async (req, res) => {
  // very simple token read (production: validate token properly)
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'invalid token' });
  }
});
// PUT /auth/contacts - Update Emergency Contacts
// PUT /auth/contacts -> Save Emergency Contacts
router.put('/contacts', async (req, res) => {
  try {
    const { userId, contacts } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Find the user by ID and update the emergencyContacts array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { emergencyContacts: contacts },
      { new: true } // This makes it return the updated data
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ status: "ok", user: updatedUser });

  } catch (err) {
    console.error("Save Contacts Error:", err);
    res.status(500).json({ error: "Server error saving contacts" });
  }
});

module.exports = router;