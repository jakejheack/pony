const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const [userCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
        const [hostCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "host"');
        const [vipCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE vip_level > 0');
        const [agencyCount] = await db.query('SELECT COUNT(*) as count FROM agencies');
        const [blockedCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE status = "blocked"');

        const [users] = await db.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5');

        res.json({
            totalUsers: userCount[0].count,
            totalHosts: hostCount[0].count,
            vipUsers: vipCount[0].count || 0,
            blockedUsers: blockedCount[0].count || 0,
            totalAgencies: agencyCount[0].count || 0,
            recentUsers: users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Agencies List
router.get('/agencies', async (req, res) => {
    try {
        const [agencies] = await db.query('SELECT * FROM agencies ORDER BY created_at DESC');
        res.json(agencies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Users List
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, username, email, mobile, gender, age, country, role, user_type, coins as wallet_balance, status, unique_id, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Block/Unblock User (Mock implementation if status column exists, else just success)
router.post('/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body; // 'active' or 'blocked'
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
