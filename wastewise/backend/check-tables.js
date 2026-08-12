const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await pool.query('SHOW TABLES;');
    console.log('Tables in defaultdb:');
    rows.forEach(row => console.log('-', Object.values(row)[0]));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
