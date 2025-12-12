import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { getTasks, postTask, patchTask, removeTask } from "../controllers/tasks.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(getTasks)
);

router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      dueDate: Joi.string().isoDate().allow(null)
    })
  }),
  asyncHandler(postTask)
);

router.patch(
  "/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    [Segments.BODY]: Joi.object({
      title: Joi.string().min(1).max(255),
      completed: Joi.boolean(),
      dueDate: Joi.string().isoDate().allow(null)
    }).min(1)
  }),
  asyncHandler(patchTask)
);

router.delete(
  "/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(removeTask)
);

export default router;

