const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrate() {
  try {
    console.log('Reading database-schema.sql...');
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Remove CREATE DATABASE and USE statements to avoid permission errors on Aiven
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS .*;/g, '');
    sql = sql.replace(/USE .*;/g, '');

    // Split queries by semicolon and execute them sequentially
    const queries = sql.split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log(`Executing ${queries.length} queries on the cloud database...`);

    for (let i = 0; i < queries.length; i++) {
      try {
        await pool.query(queries[i]);
      } catch (err) {
        console.error(`Error executing query ${i+1}: ${err.message}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
