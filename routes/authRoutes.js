const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// Helper to generate unique ID
const generateUniqueId = () => {
  return Math.floor(Math.random() * 100000000).toString();
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, mobile } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueId = generateUniqueId();
    // Generate a simple username from name or email
    const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, mobile, unique_id, username) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, mobile || '', uniqueId, username]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
        // Fallback for plain text passwords if legacy users exist (from the SQL dump we saw plain text too)
        if (password !== user.password) {
             return res.status(400).json({ message: 'Invalid credentials' });
        }
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, username: user.username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mobile Login (Simplified for demo)
router.post('/mobile-login', async (req, res) => {
  const { mobile } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE mobile = ?', [mobile]);
    
    let user;
    if (users.length === 0) {
      // If user doesn't exist, maybe register them or return error? 
      // For "Log In With Mobile Number", typically it sends OTP.
      // Since we can't do OTP, we'll simulate a "Quick Log In" or "Register" flow.
      // Let's create a temporary user or return a specific code to frontend to ask for registration details.
      // But the screen "Log In With Mobile Number" usually implies existing user or easy signup.
      // Let's just create a new user if not exists for simplicity in this demo, with a default password.
      
      const uniqueId = generateUniqueId();
      const username = 'user' + uniqueId;
      const [result] = await db.query(
        'INSERT INTO users (mobile, unique_id, username, name) VALUES (?, ?, ?, ?)',
        [mobile, uniqueId, username, 'New User']
      );
      user = { id: result.insertId, mobile, name: 'New User', username };
    } else {
      user = users[0];
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, mobile: user.mobile, username: user.username } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
