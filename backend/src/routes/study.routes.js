import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { postStudySession } from "../controllers/study.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object({
      lessonId: Joi.number().integer().positive().required(),
      technique: Joi.string().valid("pomodoro", "ultradian", "custom").required(),
      focusSeconds: Joi.number().integer().min(0).required(),
      completed: Joi.boolean().default(false)
    })
  }),
  asyncHandler(postStudySession)
);

export default router;


