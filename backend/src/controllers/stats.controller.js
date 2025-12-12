import { getStatistics } from "../services/stats.service.js";

export const getStats = async (req, res) => {
  const { interval = "weekly" } = req.query;
  const stats = await getStatistics(req.user.id, interval);
  res.json(stats);
};


