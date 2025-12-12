import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { getStats } from "../controllers/stats.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.get(
  "/",
  celebrate({
    [Segments.QUERY]: Joi.object({
      interval: Joi.string().valid("weekly", "monthly").default("weekly")
    })
  }),
  asyncHandler(getStats)
);

export default router;


