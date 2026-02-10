const db = require('./db');

async function check() {
  try {
    const [cols] = await db.query('DESCRIBE agency_hosts');
    console.log('Agency Hosts Columns:', cols.map(c => c.Field));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

check();
