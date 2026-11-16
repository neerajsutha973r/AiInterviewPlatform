import pg from "pg";
import dotenv from "dotenv";
import { buildDatabaseConfig } from "./connection.config.js";

dotenv.config();

const { Pool } = pg;

const db = new Pool(buildDatabaseConfig(process.env.DATABASE_URL));

db.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

db.on("error", () => {
  console.error("Database connection error.");
});

export default db;
