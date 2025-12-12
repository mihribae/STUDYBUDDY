import { db } from "../config/db.js";
import { createHttpError } from "../utils/http-error.js";

export async function listLessons(userId) {
  const [rows] = await db.query(
    `
      SELECT id, name, color, created_at
      FROM lessons
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return rows;
}

export async function createLesson(userId, { name, color }) {
  const [result] = await db.query(
    `
      INSERT INTO lessons (user_id, name, color)
      VALUES (?, ?, ?)
    `,
    [userId, name, color]
  );

  return {
    id: result.insertId,
    name,
    color
  };
}

export async function removeLesson(userId, lessonId) {
  const [result] = await db.query(
    `
      DELETE FROM lessons
      WHERE id = ? AND user_id = ?
    `,
    [lessonId, userId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "Lesson not found.");
  }
}

export async function listLessonEvents(userId) {
  const [rows] = await db.query(
    `
      SELECT
        le.id,
        le.lesson_id AS lessonId,
        le.event_date AS eventDate,
        l.name AS lessonName,
        l.color AS lessonColor
      FROM lesson_events le
      INNER JOIN lessons l ON le.lesson_id = l.id
      WHERE l.user_id = ?
      ORDER BY le.event_date ASC
    `,
    [userId]
  );

  return rows;
}

export async function createLessonEvent(userId, { lessonId, eventDate }) {
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

  // Convert eventDate to YYYY-MM-DD format for MySQL DATE type
  let formattedDate = eventDate;
  if (eventDate) {
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) {
      throw createHttpError(400, "Invalid date format.");
    }
    formattedDate = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
  }

  const [result] = await db.query(
    `
      INSERT INTO lesson_events (lesson_id, event_date)
      VALUES (?, ?)
    `,
    [lessonId, formattedDate]
  );

  return {
    id: result.insertId,
    lessonId,
    eventDate
  };
}


