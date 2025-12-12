import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { errors } from "celebrate";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  })
);
app.use(express.json());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", routes);

app.use(errors());

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// Serve index.html for all non-API routes (SPA routing)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendPath, "index.html"));
  } else {
    res.status(404).json({ message: "Not found." });
  }
});

app.use(errorHandler);

export default app;


