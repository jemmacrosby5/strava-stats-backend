// All the read queries that power the dashboard's stats and charts.
// Kept separate from the route handlers so the SQL logic is easy to
// test/reuse independently of Express.

import pool from "../db.js";

export interface StatsSummary {
  totalActivities: number;
  totalDistanceMeters: number;
  totalMovingTimeSeconds: number;
  mostCommonDay: string | null;
  activityTypeBreakdown: { type: string; count: number }[];
}

export async function getStatsSummary(): Promise<StatsSummary> {
  const totals = await pool.query(
    `SELECT
       COUNT(*)::int AS total_activities,
       COALESCE(SUM(distance), 0) AS total_distance,
       COALESCE(SUM(moving_time), 0) AS total_moving_time
     FROM activities`,
  );

  const commonDay = await pool.query(
    `SELECT day_of_week, COUNT(*)::int AS count
     FROM activities
     WHERE day_of_week IS NOT NULL
     GROUP BY day_of_week
     ORDER BY count DESC
     LIMIT 1`,
  );

  const typeBreakdown = await pool.query(
    `SELECT type, COUNT(*)::int AS count
     FROM activities
     GROUP BY type
     ORDER BY count DESC`,
  );

  return {
    totalActivities: totals.rows[0].total_activities,
    totalDistanceMeters: Number(totals.rows[0].total_distance),
    totalMovingTimeSeconds: Number(totals.rows[0].total_moving_time),
    mostCommonDay: commonDay.rows[0]?.day_of_week ?? null,
    activityTypeBreakdown: typeBreakdown.rows.map((r) => ({
      type: r.type,
      count: r.count,
    })),
  };
}

export interface DayBreakdown {
  dayOfWeek: string;
  count: number;
}

/** Activity counts grouped by day of week — useful for a bar chart */
export async function getBreakdownByDay(): Promise<DayBreakdown[]> {
  const result = await pool.query(
    `SELECT day_of_week, COUNT(*)::int AS count
     FROM activities
     WHERE day_of_week IS NOT NULL
     GROUP BY day_of_week`,
  );

  // Preserve a sensible week order rather than whatever order Postgres returns
  const order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const counts = new Map(result.rows.map((r) => [r.day_of_week, r.count]));

  return order.map((day) => ({ dayOfWeek: day, count: counts.get(day) ?? 0 }));
}

export interface MonthlyBreakdown {
  month: string; // e.g. "2026-07"
  activityCount: number;
  totalDistanceMeters: number;
}

/** Monthly activity count + distance — useful for a trend line chart */
export async function getBreakdownByMonth(): Promise<MonthlyBreakdown[]> {
  const result = await pool.query(
    `SELECT
       TO_CHAR(start_date, 'YYYY-MM') AS month,
       COUNT(*)::int AS activity_count,
       COALESCE(SUM(distance), 0) AS total_distance
     FROM activities
     GROUP BY month
     ORDER BY month ASC`,
  );

  return result.rows.map((r) => ({
    month: r.month,
    activityCount: r.activity_count,
    totalDistanceMeters: Number(r.total_distance),
  }));
}

export interface ActivityListItem {
  id: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  startDate: string;
  dayOfWeek: string | null;
  locationCountry: string | null;
}

export interface ActivityListParams {
  limit: number;
  offset: number;
  type?: string;
}

/** Paginated list of raw activities — useful for a table/timeline view */
export async function getActivities(
  params: ActivityListParams,
): Promise<ActivityListItem[]> {
  const { limit, offset, type } = params;

  const result = type
    ? await pool.query(
        `SELECT id, name, type, distance, moving_time, start_date, day_of_week, location_country
         FROM activities
         WHERE type = $1
         ORDER BY start_date DESC
         LIMIT $2 OFFSET $3`,
        [type, limit, offset],
      )
    : await pool.query(
        `SELECT id, name, type, distance, moving_time, start_date, day_of_week, location_country
         FROM activities
         ORDER BY start_date DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

  return result.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    type: r.type,
    distance: Number(r.distance),
    movingTime: r.moving_time,
    startDate: r.start_date,
    dayOfWeek: r.day_of_week,
    locationCountry: r.location_country,
  }));
}
