const express = require('express');
const db = require('../db');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});

const upload = multer({ storage: storage });

// Get Profile
router.get('/profile/:id', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, username, email, mobile, avatar, gender, age, country, bio, language, referral_code, unique_id, coins FROM users WHERE id = ?', [req.params.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    
    // Mock data for fields that might not exist in DB yet
    // In a real app, these would come from the DB
    const userWithStats = {
        ...user,
        wallet_balance: user.coins || 0,
        friends_count: user.friends_count || 0,
        follows_count: user.follows_count || 0,
        followers_count: user.followers_count || 0,
        visitors_count: user.visitors_count || 0,
        level: user.level || 1,
    };

    res.json(userWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile
router.put('/profile/:id', upload.single('avatar'), async (req, res) => {
  console.log('Received profile update for ID:', req.params.id);
  console.log('Body:', req.body);
  console.log('File:', req.file);

  const { name, username, age, gender, country, bio, language } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;
  
  try {
    let query = 'UPDATE users SET name = COALESCE(?, name), username = COALESCE(?, username), age = COALESCE(?, age), gender = COALESCE(?, gender), country = COALESCE(?, country), bio = COALESCE(?, bio), language = COALESCE(?, language)';
    let params = [name, username, age, gender, country, bio, language];

    if (avatar) {
      query += ', avatar = ?';
      params.push(avatar);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    console.log('Executing query:', query);
    console.log('Params:', params);

    await db.query(query, params);

    res.json({ message: 'Profile updated successfully', avatar });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get Coin History
router.get('/coin-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { filter } = req.query; // All, Income, Expense
    
    let query = `
      SELECT id, user_id, amount, type, description, created_at 
      FROM coin_history 
      WHERE user_id = ?
    `;
    const params = [id];

    if (filter === 'Income') {
      query += ` AND (type = 'income' OR amount > 0)`;
    } else if (filter === 'Expense') {
      query += ` AND (type = 'expense' OR amount < 0)`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const [history] = await db.query(query, params);
    
    // If no history exists, return some mock data for demo if needed, or empty array
    // For now, let's return empty array if table is empty but structure is valid
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching coin history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
