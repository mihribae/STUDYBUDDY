import { db } from "../config/db.js";
import { createHttpError } from "../utils/http-error.js";

export async function listTasks(userId) {
  const [rows] = await db.query(
    `
      SELECT id, title, completed, due_date, created_at, updated_at
      FROM tasks
      WHERE user_id = ?
      ORDER BY completed ASC, IF(due_date IS NULL, 1, 0), due_date ASC, created_at DESC
    `,
    [userId]
  );
  return rows;
}

export async function createTask(userId, { title, dueDate }) {
  // Convert dueDate to YYYY-MM-DD format for MySQL DATE type
  let formattedDate = null;
  if (dueDate) {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw createHttpError(400, "Invalid date format.");
    }
    formattedDate = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
  }
  
  const [result] = await db.query(
    `
      INSERT INTO tasks (user_id, title, due_date)
      VALUES (?, ?, ?)
    `,
    [userId, title, formattedDate]
  );

  const [rows] = await db.query(
    `
      SELECT id, title, completed, due_date, created_at, updated_at
      FROM tasks
      WHERE id = ?
    `,
    [result.insertId]
  );

  return rows[0];
}

export async function updateTask(userId, taskId, { title, completed, dueDate }) {
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push("title = ?");
    params.push(title);
  }

  if (completed !== undefined) {
    updates.push("completed = ?");
    params.push(completed ? 1 : 0);
  }

  if (dueDate !== undefined) {
    // Convert dueDate to YYYY-MM-DD format for MySQL DATE type
    let formattedDate = null;
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        throw createHttpError(400, "Invalid date format.");
      }
      formattedDate = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
    }
    updates.push("due_date = ?");
    params.push(formattedDate);
  }

  if (updates.length === 0) {
    throw createHttpError(400, "No fields to update.");
  }

  params.push(taskId, userId);

  const [result] = await db.query(
    `
      UPDATE tasks
      SET ${updates.join(", ")}
      WHERE id = ? AND user_id = ?
    `,
    params
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "Task not found.");
  }

  const [rows] = await db.query(
    `
      SELECT id, title, completed, due_date, created_at, updated_at
      FROM tasks
      WHERE id = ?
    `,
    [taskId]
  );

  return rows[0];
}

export async function deleteTask(userId, taskId) {
  const [result] = await db.query(
    `
      DELETE FROM tasks
      WHERE id = ? AND user_id = ?
    `,
    [taskId, userId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "Task not found.");
  }
}

