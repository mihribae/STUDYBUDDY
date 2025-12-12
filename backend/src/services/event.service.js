import { db } from "../config/db.js";
import { createHttpError } from "../utils/http-error.js";

export async function listEvents(userId, startDate, endDate) {
  const [rows] = await db.query(
    `
      SELECT
        ge.id,
        ge.title,
        ge.event_date AS eventDate,
        ge.lesson_id AS lessonId,
        ge.color,
        l.name AS lessonName,
        l.color AS lessonColor
      FROM general_events ge
      LEFT JOIN lessons l ON ge.lesson_id = l.id
      WHERE ge.user_id = ?
        AND ge.event_date >= ?
        AND ge.event_date <= ?
      ORDER BY ge.event_date ASC
    `,
    [userId, startDate, endDate]
  );
  return rows;
}

export async function createEvent(userId, { title, eventDate, lessonId, color }) {
  let finalColor = color || "#4A90E2";
  
  // Convert eventDate to YYYY-MM-DD format for MySQL DATE type
  let formattedDate = eventDate;
  if (eventDate) {
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) {
      throw createHttpError(400, "Invalid date format.");
    }
    formattedDate = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
  }
  
  // Convert lessonId to integer if provided
  const lessonIdInt = lessonId && lessonId !== "" ? parseInt(lessonId, 10) : null;
  if (lessonId && lessonId !== "" && (isNaN(lessonIdInt) || lessonIdInt <= 0)) {
    throw createHttpError(400, "Invalid lessonId.");
  }
  
  if (lessonIdInt) {
    const [lessons] = await db.query(
      `
        SELECT id, color
        FROM lessons
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [lessonIdInt, userId]
    );

    if (!lessons.length) {
      throw createHttpError(404, "Lesson not found.");
    }
    
    // If lesson is selected and no color specified, use lesson color
    if (!color && lessons[0].color) {
      finalColor = lessons[0].color;
    }
  }

  const [result] = await db.query(
    `
      INSERT INTO general_events (user_id, title, event_date, lesson_id, color)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, title, formattedDate, lessonIdInt, finalColor]
  );

  const [rows] = await db.query(
    `
      SELECT
        ge.id,
        ge.title,
        ge.event_date AS eventDate,
        ge.lesson_id AS lessonId,
        ge.color,
        l.name AS lessonName,
        l.color AS lessonColor
      FROM general_events ge
      LEFT JOIN lessons l ON ge.lesson_id = l.id
      WHERE ge.id = ?
    `,
    [result.insertId]
  );

  return rows[0];
}

export async function updateEvent(userId, eventId, { title, eventDate, lessonId, color }) {
  // Convert lessonId to integer if provided
  const lessonIdInt = lessonId && lessonId !== "" ? parseInt(lessonId, 10) : null;
  if (lessonId && lessonId !== "" && (isNaN(lessonIdInt) || lessonIdInt <= 0)) {
    throw createHttpError(400, "Invalid lessonId.");
  }
  
  if (lessonIdInt) {
    const [lessons] = await db.query(
      `
        SELECT id
        FROM lessons
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [lessonIdInt, userId]
    );

    if (!lessons.length) {
      throw createHttpError(404, "Lesson not found.");
    }
  }

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push("title = ?");
    params.push(title);
  }

  if (eventDate !== undefined) {
    // Convert eventDate to YYYY-MM-DD format for MySQL DATE type
    let formattedDate = eventDate;
    if (eventDate) {
      const date = new Date(eventDate);
      if (isNaN(date.getTime())) {
        throw createHttpError(400, "Invalid date format.");
      }
      formattedDate = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
    }
    updates.push("event_date = ?");
    params.push(formattedDate);
  }

  if (lessonId !== undefined) {
    updates.push("lesson_id = ?");
    params.push(lessonIdInt);
  }

  if (color !== undefined) {
    updates.push("color = ?");
    params.push(color);
  }

  if (updates.length === 0) {
    throw createHttpError(400, "No fields to update.");
  }

  params.push(eventId, userId);

  const [result] = await db.query(
    `
      UPDATE general_events
      SET ${updates.join(", ")}
      WHERE id = ? AND user_id = ?
    `,
    params
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "Event not found.");
  }

  const [rows] = await db.query(
    `
      SELECT
        ge.id,
        ge.title,
        ge.event_date AS eventDate,
        ge.lesson_id AS lessonId,
        ge.color,
        l.name AS lessonName,
        l.color AS lessonColor
      FROM general_events ge
      LEFT JOIN lessons l ON ge.lesson_id = l.id
      WHERE ge.id = ?
    `,
    [eventId]
  );

  return rows[0];
}

export async function deleteEvent(userId, eventId) {
  const [result] = await db.query(
    `
      DELETE FROM general_events
      WHERE id = ? AND user_id = ?
    `,
    [eventId, userId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "Event not found.");
  }
}

