import {
  createLesson,
  createLessonEvent,
  listLessonEvents,
  listLessons,
  removeLesson
} from "../services/lesson.service.js";

export const getLessons = async (req, res) => {
  const lessons = await listLessons(req.user.id);
  res.json({ lessons });
};

export const postLesson = async (req, res) => {
  const lesson = await createLesson(req.user.id, req.body);
  res.status(201).json({ lesson });
};

export const deleteLesson = async (req, res) => {
  const { lessonId } = req.params;
  await removeLesson(req.user.id, Number(lessonId));
  res.status(204).send();
};

export const getLessonEvents = async (req, res) => {
  const events = await listLessonEvents(req.user.id);
  res.json({ events });
};

export const postLessonEvent = async (req, res) => {
  const event = await createLessonEvent(req.user.id, req.body);
  res.status(201).json({ event });
};


