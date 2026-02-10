const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all levels and current user progress
router.get('/', async (req, res) => {
  try {
    const { userId, type } = req.query; // type: 'wealth' or 'charm'
    console.log(`[API] Fetching levels for userId: ${userId}, type: ${type}`);
    
    if (!['wealth', 'charm'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const table = type === 'wealth' ? 'wealth_levels' : 'charm_levels';
    const levelColumn = 'level_number';
    const thresholdColumn = type === 'wealth' ? 'coin_threshold' : 'charm_threshold';
    const iconColumn = 'icon_url';
    const userColumn = type === 'wealth' ? 'wealth' : 'charm';

    // Get levels
    const [levels] = await db.query(`SELECT * FROM ${table} ORDER BY ${levelColumn} ASC`);
    
    // Map to frontend expected format
    const mappedLevels = levels.map(l => ({
        id: l.id,
        level: l[levelColumn],
        min_wealth: type === 'wealth' ? l[thresholdColumn] : undefined,
        min_charm: type === 'charm' ? l[thresholdColumn] : undefined,
        icon_path: l[iconColumn]
    }));

    let userProgress = {
      currentValue: 0,
      currentLevel: 0,
      nextLevel: null,
      distanceToUpgrade: 0
    };

    if (userId) {
      const [users] = await db.query(`SELECT ${userColumn} FROM users WHERE id = ?`, [userId]);
      if (users.length > 0) {
        const currentValue = users[0][userColumn] || 0;
        userProgress.currentValue = currentValue;

        // Find current level
        let currentLevelObj = null;
        for (const level of levels) {
            if (currentValue >= level[thresholdColumn]) {
                currentLevelObj = level;
            } else {
                break; 
            }
        }

        userProgress.currentLevel = currentLevelObj ? currentLevelObj[levelColumn] : 0;
        
        // Find next level
        const nextLevelObj = levels.find(l => l[thresholdColumn] > currentValue);
        if (nextLevelObj) {
            userProgress.nextLevel = {
                level: nextLevelObj[levelColumn],
                requirement: nextLevelObj[thresholdColumn]
            };
            userProgress.distanceToUpgrade = nextLevelObj[thresholdColumn] - currentValue;
        } else {
            userProgress.distanceToUpgrade = 0; // Max level
        }
      }
    }

    res.json({
      levels: mappedLevels,
      userProgress
    });
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
