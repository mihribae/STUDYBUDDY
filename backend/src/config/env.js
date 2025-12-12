import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "studybuddy"
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "studybuddy-secret",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1h"
  }
};


