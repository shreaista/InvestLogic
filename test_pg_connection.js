require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "ipa",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  ssl: process.env.DB_SSLMODE === "require" ? { rejectUnauthorized: false } : false,
};

console.log("[postgres] config:", {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  passwordLength: config.password.length,
});

async function main() {
  const pool = new Pool(config);
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT current_database(), current_user;");
    const row = result.rows[0];
    client.release();
    console.log("Connection successful:");
    console.log("  database:", row.current_database);
    console.log("  user:", row.current_user);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
