const db = require('./db');

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS agency_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agency_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('Pending', 'Accepted', 'Rejected', 'Expired') DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Table agency_invitations created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  }
  process.exit();
}

createTable();
