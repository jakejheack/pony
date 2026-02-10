const db = require('./db');

async function check() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('Tables:', rows.map(r => Object.values(r)[0]));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

check();
