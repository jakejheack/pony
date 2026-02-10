const express = require('express');
const router = express.Router();
const db = require('../db');

// Get wallet info (coins)
router.get('/balance', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const [rows] = await db.query('SELECT coins, unique_id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transfer coins
router.post('/transfer', async (req, res) => {
  try {
    const { senderId, receiverUniqueId, amount } = req.body;
    
    if (!senderId || !receiverUniqueId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // 1. Get Sender
    const [senders] = await db.query('SELECT * FROM users WHERE id = ?', [senderId]);
    if (senders.length === 0) return res.status(404).json({ message: 'Sender not found' });
    const sender = senders[0];

    if (sender.unique_id === receiverUniqueId) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    if (sender.coins < transferAmount) {
      return res.status(400).json({ message: 'Insufficient coins' });
    }

    // 2. Get Receiver
    const [receivers] = await db.query('SELECT * FROM users WHERE unique_id = ?', [receiverUniqueId]);
    if (receivers.length === 0) return res.status(404).json({ message: 'Receiver not found' });
    const receiver = receivers[0];

    // 3. Perform Transaction
    // Note: In production, use transactions (BEGIN/COMMIT)
    
    // Deduct from sender
    await db.query('UPDATE users SET coins = coins - ?, sent_coins = sent_coins + ? WHERE id = ?', 
      [transferAmount, transferAmount, senderId]);

    // Add to receiver
    await db.query('UPDATE users SET coins = coins + ?, received_coins = received_coins + ? WHERE id = ?', 
      [transferAmount, transferAmount, receiver.id]);

    // Record transaction
    await db.query('INSERT INTO coin_transactions (sender_id, receiver_id, amount) VALUES (?, ?, ?)', 
      [senderId, receiver.id, transferAmount]);

    res.json({ message: 'Transfer successful', newBalance: sender.coins - transferAmount });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction history
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const [rows] = await db.query(`
      SELECT t.*, 
             s.name as sender_name, s.unique_id as sender_uid,
             r.name as receiver_name, r.unique_id as receiver_uid
      FROM coin_transactions t
      JOIN users s ON t.sender_id = s.id
      JOIN users r ON t.receiver_id = r.id
      WHERE t.sender_id = ? OR t.receiver_id = ?
      ORDER BY t.created_at DESC
    `, [userId, userId]);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
