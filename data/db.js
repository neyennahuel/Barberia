const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL. Configura la base PostgreSQL.");
}

const pool = new Pool({ connectionString: databaseUrl });

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function dbRun(sql, params = []) {
  return pool.query(sql, params);
}

module.exports = { dbAll, dbGet, dbRun };
