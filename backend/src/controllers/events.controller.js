import { listEvents, createEvent, updateEvent, deleteEvent } from "../services/event.service.js";
import { asyncHandler } from "../middleware/async-handler.js";

export const getEvents = asyncHandler(async (req, res) => {
  const today = new Date();
  const startDate = req.query.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const endDate = req.query.endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const events = await listEvents(req.user.id, startDate, endDate);
  res.json({ events });
});

export const postEvent = asyncHandler(async (req, res) => {
  const event = await createEvent(req.user.id, req.body);
  res.status(201).json({ event });
});

export const patchEvent = asyncHandler(async (req, res) => {
  const event = await updateEvent(req.user.id, req.params.id, req.body);
  res.json({ event });
});

export const removeEvent = asyncHandler(async (req, res) => {
  await deleteEvent(req.user.id, req.params.id);
  res.status(204).send();
});

