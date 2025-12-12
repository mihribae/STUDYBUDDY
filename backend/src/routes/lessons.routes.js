import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import {
  deleteLesson,
  getLessonEvents,
  getLessons,
  postLesson,
  postLessonEvent
} from "../controllers/lessons.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

const colorValidator = Joi.string()
  .pattern(/^#(?:[0-9a-fA-F]{6})$/)
  .message("Color must be a valid hex value.");

router.get("/", asyncHandler(getLessons));

router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().min(2).max(128).required(),
      color: colorValidator.default("#4A90E2")
    })
  }),
  asyncHandler(postLesson)
);

router.delete(
  "/:lessonId",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      lessonId: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(deleteLesson)
);

router.get("/events", asyncHandler(getLessonEvents));

router.post(
  "/events",
  celebrate({
    [Segments.BODY]: Joi.object({
      lessonId: Joi.number().integer().positive().required(),
      eventDate: Joi.date().iso().required()
    })
  }),
  asyncHandler(postLessonEvent)
);

export default router;


