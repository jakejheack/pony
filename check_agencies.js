const db = require('./db');

async function check() {
  try {
    const [cols] = await db.query('DESCRIBE agencies');
    console.log('Agencies Columns:', cols.map(c => c.Field));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

check();
