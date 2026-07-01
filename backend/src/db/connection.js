import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

db.on("error", (err) => {
  console.error("Database error:", err);
});

export default db;