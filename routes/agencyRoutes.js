const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Agency Dashboard Data
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 1. Get Agency Details
    // For demo purposes, if user doesn't have an agency, return a demo one or create one
    let [agencies] = await db.query(`SELECT * FROM agencies WHERE user_id = ?`, [userId]);
    
    let agency;
    if (agencies.length === 0) {
      // Create a demo agency for this user if not exists
      // Or just fetch the first agency in DB for demo
      // Let's create a dummy one for the user so they see "Demo Agency"
      const demoAgency = {
        user_id: userId,
        name: 'Demo Agency',
        code: 'AG-RG' + Math.floor(1000 + Math.random() * 9000),
        email: 'john@gmail.com',
        mobile: '+919876543210',
        country: 'Antarctica',
        commission: 10,
        status: 'Active',
        created_at: new Date()
      };
      
      const [result] = await db.query(`INSERT INTO agencies SET ?`, demoAgency);
      agency = { ...demoAgency, id: result.insertId };
    } else {
      agency = agencies[0];
    }

    // 2. Get Stats
    // Today Income
    const today = new Date().toISOString().split('T')[0];
    const [todayInc] = await db.query(`
      SELECT SUM(amount) as total 
      FROM agency_transactions 
      WHERE agency_id = ? AND DATE(created_at) = ?
    `, [agency.id, today]);

    // Week Income
    const [weekInc] = await db.query(`
      SELECT SUM(amount) as total 
      FROM agency_transactions 
      WHERE agency_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
    `, [agency.id]);

    // Withdrawn Stats
    const [payouts] = await db.query(`
      SELECT SUM(amount) as total_amount, SUM(coins) as total_coins 
      FROM agency_payouts 
      WHERE agency_id = ? AND status = 'paid'
    `, [agency.id]);

    // Host Count
    const [hosts] = await db.query(`SELECT COUNT(*) as count FROM agency_hosts WHERE agency_id = ?`, [agency.id]);

    // Host Coins (Total earnings of hosts?)
    // Assuming this is sum of wallet balance of all hosts or similar. 
    // For now, let's use a mock or query sum of host earnings.
    const hostCoins = 27089; // Static or calculated

    const stats = {
      commission: agency.commission,
      withdrawn_coins: payouts[0].total_coins || 0,
      withdrawn_amount: payouts[0].total_amount || 0,
      net_earnings: agency.earnings || 3021, // Use agency earnings column
      pending_coins: agency.earnings || 3021, // Added for Payouts screen
      today_income: todayInc[0].total || 0,
      week_income: weekInc[0].total || 0,
      total_hosts: hosts[0].count || 1,
      host_coins: hostCoins
    };

    res.json({ agency, stats });

  } catch (error) {
    console.error('Agency dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Agency History (Recent Earnings)
router.get('/history/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Fetch transactions with sender/receiver details
    let query = `
      SELECT t.*, 
             s.name as sender_name, s.avatar as sender_avatar,
             r.name as receiver_name, r.avatar as receiver_avatar
      FROM agency_transactions t
      LEFT JOIN users s ON t.sender_id = s.id
      LEFT JOIN users r ON t.receiver_id = r.id
      WHERE t.agency_id = ?
    `;
    
    const params = [agencyId];

    if (startDate) {
        query += ` AND DATE(t.created_at) >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND DATE(t.created_at) <= ?`;
        params.push(endDate);
    }

    query += ` ORDER BY t.created_at DESC`;
    
    if (!startDate && !endDate) {
        query += ` LIMIT 50`; // Default limit if no filter
    }
    
    const [history] = await db.query(query, params);
    
    // Format for frontend
    const formattedHistory = history.map(item => {
      const amount = parseFloat(item.amount) || 0;
      const commissionRate = 10; // 10%
      const agencyCoin = (amount * commissionRate / 100).toFixed(2);
      
      return {
        id: item.id,
        transaction_id: `HIS-${item.id.toString(16).toUpperCase().padStart(6, '0')}`,
        type: item.type || 'Private Call', // Default to Private Call if null
        sender: {
          name: item.sender_name || 'Unknown',
          avatar: item.sender_avatar
        },
        receiver: {
          name: item.receiver_name || 'Unknown',
          avatar: item.receiver_avatar
        },
        amount: amount,
        commission_rate: commissionRate,
        agency_coin: parseFloat(agencyCoin),
        created_at: item.created_at
      };
    });

    res.json(formattedHistory);

  } catch (error) {
    console.error('Agency history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add Host
router.post('/add-host', async (req, res) => {
  try {
    const { agencyId, hostUniqueId } = req.body;
    
    // Find user by unique ID (assuming username or code?)
    // Let's assume 'username' or 'id' is the unique ID
    const [users] = await db.query(`SELECT id FROM users WHERE username = ? OR id = ? OR unique_id = ?`, [hostUniqueId, hostUniqueId, hostUniqueId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const hostId = users[0].id;
    
    // Check if already in agency
    const [existing] = await db.query(`SELECT * FROM agency_hosts WHERE user_id = ?`, [hostId]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User is already a host' });
    }
    
    // Add to agency
    await db.query(`INSERT INTO agency_hosts (agency_id, user_id, status, joined_at) VALUES (?, ?, 'active', NOW())`, [agencyId, hostId]);
    
    // Update agency host count
    await db.query(`UPDATE agencies SET hosts_count = hosts_count + 1 WHERE id = ?`, [agencyId]);

    res.json({ message: 'Host added successfully' });

  } catch (error) {
    console.error('Add host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Agency Hosts
router.get('/hosts/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { search } = req.query;
    
    let query = `
      SELECT h.*, u.name, u.avatar, u.username, u.email, u.unique_id,
             (SELECT SUM(duration) FROM live_history WHERE user_id = u.id AND created_at >= CURDATE()) as today_duration
      FROM agency_hosts h
      JOIN users u ON h.user_id = u.id
      WHERE h.agency_id = ?
    `;
    
    const params = [agencyId];
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.username LIKE ? OR u.unique_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY h.joined_at DESC`;
    
    const [hosts] = await db.query(query, params);
    
    res.json(hosts);
  } catch (error) {
    console.error('Get hosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Host Applications
router.get('/applications/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { status, startDate, endDate } = req.query;
    
    let query = `
      SELECT a.*, u.avatar, u.unique_id, u.name as user_name
      FROM host_applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.agency_id = ?
    `;
    const params = [agencyId];
    
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND DATE(a.created_at) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(a.created_at) <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const [apps] = await db.query(query, params);
    res.json(apps);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Application Status
router.post('/application/status', async (req, res) => {
  try {
    const { applicationId, status } = req.body;
    
    await db.query(`UPDATE host_applications SET status = ? WHERE id = ?`, [status, applicationId]);
    
    if (status === 'Accepted') {
      // Add to agency_hosts
      const [app] = await db.query(`SELECT * FROM host_applications WHERE id = ?`, [applicationId]);
      if (app.length > 0) {
        // Check if already host
        const [existing] = await db.query(`SELECT * FROM agency_hosts WHERE user_id = ?`, [app[0].user_id]);
        if (existing.length === 0) {
           await db.query(`INSERT INTO agency_hosts (agency_id, user_id, status, joined_at) VALUES (?, ?, 'active', NOW())`, [app[0].agency_id, app[0].user_id]);
           await db.query(`UPDATE agencies SET hosts_count = hosts_count + 1 WHERE id = ?`, [app[0].agency_id]);
        }
      }
    }
    
    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update app status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Agency Payouts
router.get('/payouts/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { type, status, startDate, endDate } = req.query;
    
    let query = `SELECT * FROM agency_payouts WHERE agency_id = ?`;
    const params = [agencyId];

    if (type) {
        query += ` AND type = ?`;
        params.push(type); // 'agency' or 'host'
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    if (startDate) {
        query += ` AND DATE(created_at) >= ?`;
        params.push(startDate);
    }
  
    if (endDate) {
        query += ` AND DATE(created_at) <= ?`;
        params.push(endDate);
    }

    query += ` ORDER BY created_at DESC`;

    const [payouts] = await db.query(query, params);
    res.json(payouts);
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Agency Invitations
router.get('/invitations/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT i.*, u.avatar, u.unique_id, u.name as user_name
      FROM agency_invitations i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.agency_id = ?
    `;
    const params = [agencyId];
    
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY i.created_at DESC`;
    
    const [invitations] = await db.query(query, params);
    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite Host
router.post('/invitations/invite', async (req, res) => {
  try {
    const { agencyId, hostUniqueId } = req.body;
    
    // Find user by unique ID
    const [users] = await db.query(`SELECT id FROM users WHERE unique_id = ? OR username = ?`, [hostUniqueId, hostUniqueId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const hostId = users[0].id;
    
    // Check if already in agency
    const [existingHost] = await db.query(`SELECT * FROM agency_hosts WHERE user_id = ?`, [hostId]);
    if (existingHost.length > 0) {
      return res.status(400).json({ message: 'User is already a host in an agency' });
    }

    // Check if pending invitation exists
    const [existingInv] = await db.query(`SELECT * FROM agency_invitations WHERE user_id = ? AND agency_id = ? AND status = 'Pending'`, [hostId, agencyId]);
    if (existingInv.length > 0) {
      return res.status(400).json({ message: 'Invitation already pending for this user' });
    }
    
    // Create invitation
    await db.query(`INSERT INTO agency_invitations (agency_id, user_id, status) VALUES (?, ?, 'Pending')`, [agencyId, hostId]);
    
    res.json({ message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('Invite host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel Invitation
router.post('/invitations/cancel', async (req, res) => {
  try {
    const { invitationId } = req.body;
    
    await db.query(`DELETE FROM agency_invitations WHERE id = ?`, [invitationId]);
    
    res.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply to Agency (Join Request)
router.post('/join', async (req, res) => {
  try {
    const { userId, agencyCode } = req.body;

    // 1. Find Agency by Code
    const [agencies] = await db.query(`SELECT id FROM agencies WHERE code = ?`, [agencyCode]);
    if (agencies.length === 0) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    const agencyId = agencies[0].id;

    // 2. Check if user is already a host in ANY agency
    const [existingHost] = await db.query(`SELECT * FROM agency_hosts WHERE user_id = ?`, [userId]);
    if (existingHost.length > 0) {
      return res.status(400).json({ message: 'You are already a host in an agency' });
    }

    // 3. Check for pending applications
    const [existingApp] = await db.query(`SELECT * FROM host_applications WHERE user_id = ? AND status = 'Pending'`, [userId]);
    if (existingApp.length > 0) {
      return res.status(400).json({ message: 'You already have a pending application' });
    }

    // 4. Create Application
    await db.query(`INSERT INTO host_applications (user_id, agency_id, status) VALUES (?, ?, 'Pending')`, [userId, agencyId]);

    res.json({ message: 'Request sent successfully' });

  } catch (error) {
    console.error('Join agency error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
