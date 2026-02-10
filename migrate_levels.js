const db = require('./db');

async function migrate() {
  try {
    // Create wealth_levels table
    await db.query(`
      CREATE TABLE IF NOT EXISTS wealth_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level INT NOT NULL,
        min_wealth INT NOT NULL,
        icon_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create charm_levels table
    await db.query(`
      CREATE TABLE IF NOT EXISTS charm_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level INT NOT NULL,
        min_charm INT NOT NULL,
        icon_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created');

    // Check if data exists
    const [wealthRows] = await db.query('SELECT COUNT(*) as count FROM wealth_levels');
    
    if (wealthRows[0].count === 0) {
      const wealthIcons = [
        'uploads/wealth/wealth_6981689aa11fb.png',
        'uploads/wealth/wealth_698168c9f222d.png',
        'uploads/wealth/wealth_698168ed3ccf4.png',
        'uploads/wealth/wealth_698169099a20d.png',
        'uploads/wealth/wealth_6981692029612.png',
        'uploads/wealth/wealth_69816a9bda019.png',
        'uploads/wealth/wealth_69816ab32a7f5.png',
        'uploads/wealth/wealth_69816acb6c651.png'
      ];
      
      for (let i = 0; i < wealthIcons.length; i++) {
        await db.query('INSERT INTO wealth_levels (level, min_wealth, icon_path) VALUES (?, ?, ?)', [i + 1, (i + 1) * 1000 - 1, wealthIcons[i]]);
      }
      console.log('Wealth levels populated');
    }

    const [charmRows] = await db.query('SELECT COUNT(*) as count FROM charm_levels');

    if (charmRows[0].count === 0) {
      const charmIcons = [
        'uploads/charm/charm_6984c1b03ed56.png',
        'uploads/charm/charm_6984c1f017224.png',
        'uploads/charm/charm_6984c20df1009.png',
        'uploads/charm/charm_6984c22d1f775.png',
        'uploads/charm/charm_6984c24251325.png',
        'uploads/charm/charm_6984c25da7cc7.png',
        'uploads/charm/charm_6984c2810b397.png',
        'uploads/charm/charm_6984f78157cb4.png'
      ];

      for (let i = 0; i < charmIcons.length; i++) {
        await db.query('INSERT INTO charm_levels (level, min_charm, icon_path) VALUES (?, ?, ?)', [i + 1, (i + 1) * 1000 - 1, charmIcons[i]]);
      }
      console.log('Charm levels populated');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
