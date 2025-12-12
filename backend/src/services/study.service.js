import { db } from "../config/db.js";
import { createHttpError } from "../utils/http-error.js";

const SUPPORTED_TECHNIQUES = new Set(["pomodoro", "ultradian", "custom"]);

export async function logStudySession(userId, { lessonId, technique, focusSeconds, completed }) {
  if (!SUPPORTED_TECHNIQUES.has(technique)) {
    throw createHttpError(400, "Unsupported technique.");
  }

  const [lessons] = await db.query(
    `
      SELECT id
      FROM lessons
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    [lessonId, userId]
  );

  if (!lessons.length) {
    throw createHttpError(404, "Lesson not found.");
  }

  await db.query(
    `
      INSERT INTO study_sessions (user_id, lesson_id, technique, focus_seconds, completed)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, lessonId, technique, focusSeconds, completed ? 1 : 0]
  );
}


