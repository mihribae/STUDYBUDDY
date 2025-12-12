import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing." });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}


