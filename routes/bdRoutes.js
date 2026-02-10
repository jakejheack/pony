const express = require('express');
const router = express.Router();
const db = require('../db');

// Get BD Admin Dashboard Stats
router.get('/dashboard/:bdId', async (req, res) => {
  try {
    const { bdId } = req.params;

    // 1. Get Linked Agencies Count
    const [agencies] = await db.query(`SELECT COUNT(*) as count FROM agencies WHERE bd_id = ?`, [bdId]);
    
    // 2. Get Total Hosts in Linked Agencies
    const [hosts] = await db.query(`
      SELECT COUNT(*) as count 
      FROM agency_hosts h
      JOIN agencies a ON h.agency_id = a.id
      WHERE a.bd_id = ?
    `, [bdId]);

    // 3. Get Total Earnings of Linked Agencies
    const [earnings] = await db.query(`
      SELECT SUM(earnings) as total 
      FROM agencies 
      WHERE bd_id = ?
    `, [bdId]);

    // 4. Get Recent Activity (e.g., new hosts joined in linked agencies)
    // Optional: Add recent activity query here if needed

    const stats = {
      total_agencies: agencies[0].count,
      total_hosts: hosts[0].count,
      total_earnings: earnings[0].total || 0
    };

    res.json(stats);

  } catch (error) {
    console.error('BD dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Linked Agencies
router.get('/agencies/:bdId', async (req, res) => {
  try {
    const { bdId } = req.params;
    
    const [agencies] = await db.query(`
      SELECT * FROM agencies 
      WHERE bd_id = ? 
      ORDER BY created_at DESC
    `, [bdId]);
    
    res.json(agencies);
  } catch (error) {
    console.error('BD agencies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Hosts under Linked Agencies
router.get('/hosts/:bdId', async (req, res) => {
  try {
    const { bdId } = req.params;
    
    const [hosts] = await db.query(`
      SELECT h.*, u.name, u.avatar, u.username, u.unique_id, a.name as agency_name
      FROM agency_hosts h
      JOIN users u ON h.user_id = u.id
      JOIN agencies a ON h.agency_id = a.id
      WHERE a.bd_id = ?
      ORDER BY h.joined_at DESC
    `, [bdId]);
    
    res.json(hosts);
  } catch (error) {
    console.error('BD hosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Link Agency to BD (For Setup/Testing)
router.post('/link-agency', async (req, res) => {
  try {
    const { bdId, agencyCode } = req.body;
    
    // Check if agency exists
    const [agencies] = await db.query(`SELECT id FROM agencies WHERE code = ?`, [agencyCode]);
    if (agencies.length === 0) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    
    const agencyId = agencies[0].id;
    
    // Update agency with bd_id
    await db.query(`UPDATE agencies SET bd_id = ? WHERE id = ?`, [bdId, agencyId]);
    
    res.json({ message: 'Agency linked successfully' });
  } catch (error) {
    console.error('Link agency error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
