import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  createUser,
  findUserByEmail,
  toPublicUser,
  verifyPassword
} from "../services/user.service.js";
import { createHttpError } from "../utils/http-error.js";

function signToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username
  };

  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
}

export const register = async (req, res) => {
  const { username, email, password, preferredLanguage } = req.body;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw createHttpError(409, "Email already registered.");
  }

  const user = await createUser({
    username,
    email,
    password,
    preferredLanguage
  });
  const token = signToken(user);

  res.status(201).json({
    token,
    user: toPublicUser({ ...user, preferred_language: user.preferredLanguage })
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    throw createHttpError(401, "Invalid credentials.");
  }

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    throw createHttpError(401, "Invalid credentials.");
  }

  const token = signToken(user);

  res.json({
    token,
    user: toPublicUser(user)
  });
};


