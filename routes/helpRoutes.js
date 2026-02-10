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
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Submit Help Request
router.post('/submit', upload.single('image'), async (req, res) => {
  const { userId, complaint, contactNumber } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!userId || !complaint) {
    return res.status(400).json({ message: 'User ID and complaint are required' });
  }

  try {
    const query = 'INSERT INTO help_requests (user_id, complaint, contact_number, image_path) VALUES (?, ?, ?, ?)';
    const params = [userId, complaint, contactNumber, imagePath];

    await db.query(query, params);

    res.status(201).json({ message: 'Help request submitted successfully' });
  } catch (error) {
    console.error('Error submitting help request:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
