import { listTasks, createTask, updateTask, deleteTask } from "../services/task.service.js";
import { asyncHandler } from "../middleware/async-handler.js";

export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await listTasks(req.user.id);
  res.json({ tasks });
});

export const postTask = asyncHandler(async (req, res) => {
  const task = await createTask(req.user.id, req.body);
  res.status(201).json({ task });
});

export const patchTask = asyncHandler(async (req, res) => {
  const task = await updateTask(req.user.id, req.params.id, req.body);
  res.json({ task });
});

export const removeTask = asyncHandler(async (req, res) => {
  await deleteTask(req.user.id, req.params.id);
  res.status(204).send();
});

