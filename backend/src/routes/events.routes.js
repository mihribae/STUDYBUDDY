import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { getEvents, postEvent, patchEvent, removeEvent } from "../controllers/events.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.get(
  "/",
  celebrate({
    [Segments.QUERY]: Joi.object({
      startDate: Joi.string().isoDate(),
      endDate: Joi.string().isoDate()
    })
  }),
  asyncHandler(getEvents)
);

router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      eventDate: Joi.string().isoDate().required(),
      lessonId: Joi.number().integer().positive().allow(null),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/)
    })
  }),
  asyncHandler(postEvent)
);

router.patch(
  "/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    [Segments.BODY]: Joi.object({
      title: Joi.string().min(1).max(255),
      eventDate: Joi.string().isoDate(),
      lessonId: Joi.number().integer().positive().allow(null),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/)
    }).min(1)
  }),
  asyncHandler(patchEvent)
);

router.delete(
  "/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(removeEvent)
);

export default router;

