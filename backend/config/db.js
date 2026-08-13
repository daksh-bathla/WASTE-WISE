const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool;

const createMysqlPool = () => mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wastewise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const createFakePool = () => {
  const fakeDb = require('./fakeDb');
  return {
    query: async (sql, params = []) => fakeDb.query(sql, params),
    end: async () => {},
  };
};

const isConnectionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return ['econnrefused', 'etimedout', 'getaddrinfo', 'enotfound', 'host not found', 'access denied', 'unknown database'].some((token) => message.includes(token));
};

const initPool = () => {
  if (pool) return pool;

  const hasDbConfig = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
  const shouldUseFakeDb = process.env.USE_FAKE_DB === 'true' || (!hasDbConfig && process.env.NODE_ENV !== 'production');

  if (shouldUseFakeDb) {
    console.log('[DB] Using local fake database for this environment');
    pool = createFakePool();
    return pool;
  }

  console.log(`[DB] Connecting to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);

  const mysqlPool = createMysqlPool();
  pool = {
    query: async (sql, params = []) => {
      try {
        return await mysqlPool.query(sql, params);
      } catch (error) {
        if (isConnectionError(error)) {
          console.warn('[DB] MySQL unavailable, switching to local fake database:', error.message);
          pool = createFakePool();
          return pool.query(sql, params);
        }
        throw error;
      }
    },
    end: async () => mysqlPool.end(),
  };

  return pool;
};

const getPool = () => initPool();

module.exports = new Proxy({}, {
  get: (_target, prop) => getPool()[prop],
  apply: (_target, _thisArg, args) => getPool().apply(_thisArg, args),
});
