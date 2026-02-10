const db = require('./db');

async function checkColumns() {
  try {
    const [rows] = await db.query('SHOW COLUMNS FROM users');
    console.log('Columns in users table:');
    rows.forEach(row => console.log(row.Field));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();
