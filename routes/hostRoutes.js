const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Host Dashboard Data
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Get Host & Agency Info
    const [hosts] = await db.query(`
      SELECT h.*, a.name as agency_name, a.code as agency_code, a.commission as agency_commission
      FROM hosts h
      LEFT JOIN agency_hosts ah ON h.user_id = ah.user_id
      LEFT JOIN agencies a ON ah.agency_id = a.id
      WHERE h.user_id = ?
    `, [userId]);

    let hostInfo = hosts[0] || {
      status: 'Active',
      agency_name: 'Demo Agency',
      agency_code: 'AG-DEMO',
      commission_rate: 10
    };

    // 2. Get User Info
    const [users] = await db.query('SELECT name, unique_id, gender, country, avatar, coins FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) return res.status(404).json({ message: 'User not found' });

    // 3. Get Call Activity (Using host_id = userId in call_logs)
    const [callStats] = await db.query(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_calls,
        COUNT(*) as total_calls
      FROM call_logs 
      WHERE host_id = ?
    `, [userId]);

    // 4. Get Gift Activity
    const [giftStats] = await db.query(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_gifts,
        COUNT(*) as total_gifts
      FROM gift_logs 
      WHERE receiver_id = ?
    `, [userId]);

    // 5. Get Earnings Overview (Calculated from Gift Prices and Call Duration)
    const [earnings] = await db.query(`
      SELECT 
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END) as today_income,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN amount ELSE 0 END) as week_income
      FROM (
        SELECT created_at, (duration * 1) as amount FROM call_logs WHERE host_id = ?
        UNION ALL
        SELECT g.created_at, (g.quantity * gif.price) as amount 
        FROM gift_logs g
        JOIN gifts gif ON g.gift_name = gif.name
        WHERE g.receiver_id = ?
        UNION ALL
        SELECT started_at as created_at, coins_earned as amount FROM live_history WHERE user_id = ?
      ) as income
    `, [userId, userId, userId]);

    res.json({
      host: {
        ...hostInfo,
        name: user.name,
        unique_id: user.unique_id,
        gender: user.gender,
        country: user.country,
        avatar: user.avatar
      },
      stats: {
        earned_coins: user.coins, 
        today_calls: callStats[0]?.today_calls || 0,
        total_calls: callStats[0]?.total_calls || 0,
        today_gifts: giftStats[0]?.today_gifts || 0,
        total_gifts: giftStats[0]?.total_gifts || 0,
        today_income: Math.floor(earnings[0]?.today_income || 0),
        week_income: Math.floor(earnings[0]?.week_income || 0)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message, sqlMessage: error.sqlMessage });
  }
});

// Get Host History
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // 'call', 'gift', 'live'

    let query = '';
    let params = [];

    // Common subqueries
    // Call Logs: Join users to get caller info
    const callQuery = `
      SELECT 'Call' as type, c.created_at, c.duration, (c.duration * 1) as amount, u.name as other_user, u.avatar as other_user_avatar, u.unique_id as other_user_id
      FROM call_logs c
      JOIN users u ON c.caller_id = u.id
      WHERE c.host_id = ?
    `;

    // Gift Logs: Join users (sender) and gifts (price)
    const giftQuery = `
      SELECT 'Gift' as type, g.created_at, 0 as duration, (g.quantity * gif.price) as amount, u.name as other_user, u.avatar as other_user_avatar, u.unique_id as other_user_id
      FROM gift_logs g
      JOIN users u ON g.sender_id = u.id
      JOIN gifts gif ON g.gift_name = gif.name
      WHERE g.receiver_id = ?
    `;

    // Live History: No other user, just self stats
    const liveQuery = `
      SELECT 'Live Session' as type, started_at as created_at, duration, coins_earned as amount, NULL as other_user, NULL as other_user_avatar, NULL as other_user_id
      FROM live_history
      WHERE user_id = ?
    `;

    if (type === 'call') {
      query = `${callQuery} ORDER BY c.created_at DESC`;
      params = [userId];
    } else if (type === 'gift') {
      query = `${giftQuery} ORDER BY g.created_at DESC`;
      params = [userId];
    } else if (type === 'live') {
      query = `${liveQuery} ORDER BY started_at DESC`;
      params = [userId];
    } else {
      query = `
        SELECT type, created_at, duration, amount, other_user, other_user_avatar, other_user_id FROM (
          ${callQuery}
          UNION ALL
          ${giftQuery}
          UNION ALL
          ${liveQuery}
        ) as combined ORDER BY created_at DESC LIMIT 50
      `;
      params = [userId, userId, userId];
    }

    const [history] = await db.query(query, params);
    res.json(history);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Host Payouts
router.get('/payouts/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, startDate, endDate } = req.query;
      let query = `SELECT * FROM agency_payouts WHERE user_id = ?`;
      let params = [userId];
      
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      if (startDate) {
        query += ` AND created_at >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND created_at <= ?`;
        params.push(endDate + ' 23:59:59');
      }

      query += ` ORDER BY created_at DESC`;

    const [payouts] = await db.query(query, params);
    
    // Enrich data for UI
    const enrichedPayouts = payouts.map(p => {
        const isDeclined = p.status === 'declined';
        const isAccepted = p.status === 'accepted';
        
        // Mock processing time (e.g., 30 mins after request)
        const processedDate = new Date(p.created_at);
        processedDate.setMinutes(processedDate.getMinutes() + 30);
        
        return {
            ...p,
            transaction_id: `HIS-${845360 + p.id}`, // Mock ID format
            processed_at: (isAccepted || isDeclined) ? processedDate : null,
            payment_details: {
                method: 'UPI / Google Pay',
                full_name: 'Mr Smith', // In real app, fetch from user payment profile
                upi_id: 'smith123@gmail.com',
                mobile: '9876543210'
            },
            decline_reason: isDeclined ? 'Wrong Information' : null
        };
    });

    res.json(enrichedPayouts);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
