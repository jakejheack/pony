const db = require('./db');

async function check() {
  try {
    const [cols] = await db.query('DESCRIBE users');
    console.log('Users Columns:', cols.map(c => c.Field));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

check();
