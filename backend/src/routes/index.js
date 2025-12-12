import { Router } from "express";
import authRoutes from "./auth.routes.js";
import lessonsRoutes from "./lessons.routes.js";
import studyRoutes from "./study.routes.js";
import statsRoutes from "./stats.routes.js";
import tasksRoutes from "./tasks.routes.js";
import eventsRoutes from "./events.routes.js";
import profileRoutes from "./profile.routes.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use("/auth", authRoutes);

router.use(authenticate);
router.use("/lessons", lessonsRoutes);
router.use("/study-sessions", studyRoutes);
router.use("/stats", statsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/events", eventsRoutes);
router.use("/profile", profileRoutes);

export default router;


