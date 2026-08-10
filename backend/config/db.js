const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool;
let usingFakeDb = false;

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
    query: async (sql, params = []) => {
      const result = fakeDb.query(sql, params);
      return result;
    },
    end: async () => {},
  };
};

const isConnectionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return ['econnrefused', 'etimedout', 'getaddrinfo', 'host not found', 'access denied', 'unknown database'].some((token) => message.includes(token));
};

const initPool = () => {
  if (pool) return pool;

  const shouldUseFakeDb = process.env.USE_FAKE_DB === 'true' || process.env.NODE_ENV !== 'production';

  if (shouldUseFakeDb) {
    console.log('[DB] Using local fake database for this environment');
    pool = createFakePool();
    usingFakeDb = true;
    return pool;
  }

  const mysqlPool = createMysqlPool();
  pool = new Proxy(mysqlPool, {
    get(target, prop) {
      if (prop === 'query') {
        return async (...args) => {
          try {
            return await target.query(...args);
          } catch (error) {
            if (!usingFakeDb && isConnectionError(error)) {
              usingFakeDb = true;
              console.warn('[DB] MySQL unavailable, using local fake database fallback:', error.message);
              return createFakePool().query(...args);
            }
            throw error;
          }
        };
      }
      return Reflect.get(target, prop);
    },
  });
  return pool;
};

const getPool = () => initPool();

module.exports = new Proxy({}, {
  get: (_target, prop) => getPool()[prop],
  apply: (_target, _thisArg, args) => getPool().apply(_thisArg, args),
});
