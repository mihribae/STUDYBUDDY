import { asyncHandler } from "../middleware/async-handler.js";
import { createHttpError } from "../utils/http-error.js";
import { getUserById, updateUser, changePassword, toPublicUser } from "../services/user.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) {
    throw createHttpError(404, "User not found.");
  }
  res.json({ user: toPublicUser(user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await updateUser(req.user.id, req.body);
  res.json({ user: toPublicUser(updatedUser) });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await changePassword(req.user.id, currentPassword, newPassword);
  res.status(204).send();
});

