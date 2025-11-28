// Example auth controller (can be expanded)
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash });
    await user.save();
    res.json({ status: 'ok', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'register failed' });
  }
};