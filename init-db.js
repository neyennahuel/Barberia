const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const SEED_PATH = path.join(__dirname, "seed.sql");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  await pool.query(sql);
}

async function init() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL");
  }
  await runSqlFile(SCHEMA_PATH);
  await runSqlFile(SEED_PATH);
  await pool.end();
  console.log("Base inicializada.");
}

init().catch((error) => {
  console.error("Error inicializando DB:", error.message);
  process.exit(1);
});
