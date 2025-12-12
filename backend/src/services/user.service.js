import bcrypt from "bcrypt";
import { db } from "../config/db.js";
import { createHttpError } from "../utils/http-error.js";

const SALT_ROUNDS = 12;

const mapUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  preferredLanguage: row.preferred_language
});

export async function findUserByEmail(email) {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (!rows.length) return null;
  return rows[0];
}

export async function createUser({ username, email, password, preferredLanguage = "en" }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await db.query(
    `INSERT INTO users (username, email, password_hash, preferred_language)
     VALUES (?, ?, ?, ?)`,
    [username, email, passwordHash, preferredLanguage]
  );
  return {
    id: result.insertId,
    username,
    email,
    preferredLanguage
  };
}

export function toPublicUser(row) {
  return mapUser(row);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function getUserById(userId) {
  const [rows] = await db.query(
    `SELECT id, username, email, preferred_language FROM users WHERE id = ?`,
    [userId]
  );
  if (!rows.length) return null;
  return mapUser(rows[0]);
}

export async function updateUser(userId, { username, email, preferredLanguage }) {
  const updates = [];
  const params = [];

  if (username !== undefined) {
    updates.push("username = ?");
    params.push(username);
  }

  if (email !== undefined) {
    updates.push("email = ?");
    params.push(email);
  }

  if (preferredLanguage !== undefined) {
    updates.push("preferred_language = ?");
    params.push(preferredLanguage);
  }

  if (updates.length === 0) {
    throw createHttpError(400, "No fields to update.");
  }

  params.push(userId);

  const [result] = await db.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    params
  );

  if (!result.affectedRows) {
    throw createHttpError(404, "User not found.");
  }

  return getUserById(userId);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await db.query(
    `SELECT password_hash FROM users WHERE id = ?`,
    [userId]
  );

  if (!rows.length) {
    throw createHttpError(404, "User not found.");
  }

  const passwordValid = await verifyPassword(currentPassword, rows[0].password_hash);
  if (!passwordValid) {
    throw createHttpError(401, "Current password is incorrect.");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.query(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
    [newPasswordHash, userId]
  );
}


