const jwt = require('jsonwebtoken');
const User = require('../../models/user');

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Register new user
async function registerUser(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({ name, email, password });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
}

// Login
async function loginUser(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await user.matchPassword(password)) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
}

// Get user profile
async function getUserProfile(req, res) {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
}

module.exports = { registerUser, loginUser, getUserProfile };
