import mysql from "mysql2/promise";
import { env } from "./env.js";

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z"
});

export const db = {
  query: (sql, params) => pool.query(sql, params),
  getConnection: () => pool.getConnection(),
  ping: () => pool.query("SELECT 1")
};


