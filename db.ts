import dotenv from "dotenv";
import { Pool } from "pg";
dotenv.config();

const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: dbPort,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});

export default pool;
