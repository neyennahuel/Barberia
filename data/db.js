const path = require("path");
const { Pool } = require("pg");
const { createDemoDb } = require("./demo-db");

const databaseUrl = process.env.DATABASE_URL;

let pool = null;
let demo = null;

if (databaseUrl) {
  pool = new Pool({ connectionString: databaseUrl });
} else {
  const dataPath = path.join(__dirname, "demo-db.json");
  demo = createDemoDb({ dataPath });
  console.warn("DATABASE_URL no definido. Usando base demo.");
}

async function dbAll(sql, params = []) {
  if (pool) {
    const result = await pool.query(sql, params);
    return result.rows;
  }
  return demo.dbAll(sql, params);
}

async function dbGet(sql, params = []) {
  if (pool) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  }
  return demo.dbGet(sql, params);
}

async function dbRun(sql, params = []) {
  if (pool) {
    return pool.query(sql, params);
  }
  return demo.dbRun(sql, params);
}

module.exports = { dbAll, dbGet, dbRun };
