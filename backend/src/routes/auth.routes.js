import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { register, login } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

const LANGUAGES = ["en", "tr", "cs"];

router.post(
  "/register",
  celebrate({
    [Segments.BODY]: Joi.object({
      username: Joi.string().min(2).max(64).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      preferredLanguage: Joi.string()
        .valid(...LANGUAGES)
        .default("en")
    })
  }),
  asyncHandler(register)
);

router.post(
  "/login",
  celebrate({
    [Segments.BODY]: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required()
    })
  }),
  asyncHandler(login)
);

export default router;


