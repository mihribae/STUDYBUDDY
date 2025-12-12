import { db } from "../config/db.js";

const INTERVALS = {
  weekly: 7,
  monthly: 30
};

const minutesFromSeconds = (seconds) => seconds / 60;

function toDateTimeString(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function computeRange(interval) {
  const days = INTERVALS[interval] ?? INTERVALS.weekly;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return {
    start: toDateTimeString(start),
    end: toDateTimeString(now)
  };
}

export async function getStatistics(userId, interval = "weekly") {
  const { start } = computeRange(interval);

  const totalsPromise = db.query(
    `
      SELECT DATE(created_at) AS date_label, SUM(focus_seconds) AS total_seconds
      FROM study_sessions
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `,
    [userId, start]
  );

  const lessonsPromise = db.query(
    `
      SELECT
        l.name AS lesson,
        l.color AS color,
        SUM(s.focus_seconds) AS total_seconds
      FROM study_sessions s
      INNER JOIN lessons l ON s.lesson_id = l.id
      WHERE s.user_id = ? AND s.created_at >= ?
      GROUP BY l.id, l.name, l.color
      ORDER BY total_seconds DESC
    `,
    [userId, start]
  );

  const hoursPromise = db.query(
    `
      SELECT
        HOUR(created_at) AS hour_bucket,
        SUM(focus_seconds) AS total_seconds
      FROM study_sessions
      WHERE user_id = ? AND created_at >= ?
      GROUP BY hour_bucket
      ORDER BY hour_bucket ASC
    `,
    [userId, start]
  );

  const techniquePromise = db.query(
    `
      SELECT
        technique,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_cycles
      FROM study_sessions
      WHERE user_id = ? AND created_at >= ?
      GROUP BY technique
    `,
    [userId, start]
  );

  const [[totals], [lessons], [hours], [techniques]] = await Promise.all([
    totalsPromise,
    lessonsPromise,
    hoursPromise,
    techniquePromise
  ]);

  return {
    totals: totals.map((row) => ({
      label: row.date_label,
      minutes: minutesFromSeconds(Number(row.total_seconds ?? 0))
    })),
    byLesson: lessons.map((row) => ({
      lesson: row.lesson,
      color: row.color,
      minutes: minutesFromSeconds(Number(row.total_seconds ?? 0))
    })),
    byHour: hours.map((row) => ({
      hour: row.hour_bucket,
      hourLabel: `${String(row.hour_bucket).padStart(2, "0")}:00`,
      minutes: minutesFromSeconds(Number(row.total_seconds ?? 0))
    })),
    byTechnique: techniques.map((row) => ({
      technique: row.technique,
      completedCycles: Number(row.completed_cycles ?? 0)
    }))
  };
}


