import app from "./app.js";
import { env } from "./config/env.js";
import { db } from "./config/db.js";

const port = env.port;

async function start() {
  try {
    await db.ping();
    app.listen(port, () => {
      console.log(`StudyBuddy API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();


