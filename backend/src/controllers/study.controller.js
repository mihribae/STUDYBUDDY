import { logStudySession } from "../services/study.service.js";

export const postStudySession = async (req, res) => {
  await logStudySession(req.user.id, req.body);
  res.status(201).json({ ok: true });
};


