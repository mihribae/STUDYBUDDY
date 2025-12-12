import { Router } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { getProfile, updateProfile, updatePassword } from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();
const LANGUAGES = ["en", "tr", "cs"];

router.use(authenticate);

router.get("/", asyncHandler(getProfile));

router.patch(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object({
      username: Joi.string().min(2).max(64),
      email: Joi.string().email(),
      preferredLanguage: Joi.string().valid(...LANGUAGES)
    }).min(1)
  }),
  asyncHandler(updateProfile)
);

router.patch(
  "/password",
  celebrate({
    [Segments.BODY]: Joi.object({
      currentPassword: Joi.string().min(8).required(),
      newPassword: Joi.string().min(8).required()
    })
  }),
  asyncHandler(updatePassword)
);

export default router;

