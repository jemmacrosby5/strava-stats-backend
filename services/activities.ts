// Handles saving Strava activities into Postgres, and deleting them
// when Strava tells us an activity was removed.

import pool from "../db.js";
import type { StravaActivity } from "../types/strava.js";
import { getCountryFromLatLng } from "./geocode.js";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Inserts a new activity, or updates it if one with the same id already exists
 * (this is what makes it safe to call repeatedly — e.g. if a webhook fires
 * twice for the same activity, or you manually re-sync).
 */
export async function upsertActivity(activity: StravaActivity): Promise<void> {
  const startDate = new Date(activity.start_date);
  const dayOfWeek = DAYS_OF_WEEK[startDate.getUTCDay()];

  // Strava's own location_country field is unreliable, so derive it ourselves
  // from GPS coordinates when available
  const startLatLng = activity.start_latlng as
    | [number, number]
    | null
    | undefined;
  const locationCountry = await getCountryFromLatLng(startLatLng);

  await pool.query(
    `INSERT INTO activities (
      id, name, type, distance, moving_time, elapsed_time,
      total_elevation_gain, start_date, day_of_week,
      average_speed, max_speed, average_heartrate, location_country, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      distance = EXCLUDED.distance,
      moving_time = EXCLUDED.moving_time,
      elapsed_time = EXCLUDED.elapsed_time,
      total_elevation_gain = EXCLUDED.total_elevation_gain,
      start_date = EXCLUDED.start_date,
      day_of_week = EXCLUDED.day_of_week,
      average_speed = EXCLUDED.average_speed,
      max_speed = EXCLUDED.max_speed,
      average_heartrate = EXCLUDED.average_heartrate,
      location_country = EXCLUDED.location_country,
      updated_at = NOW()`,
    [
      activity.id,
      activity.name,
      activity.type,
      activity.distance,
      activity.moving_time,
      activity.elapsed_time ?? null,
      activity.total_elevation_gain,
      startDate,
      dayOfWeek,
      activity.average_speed ?? null,
      activity.max_speed ?? null,
      activity.average_heartrate ?? null,
      locationCountry,
    ],
  );
}

/**
 * Removes an activity — used when Strava sends a delete webhook event,
 * or when an activity's visibility changes such that it's no longer accessible.
 */
export async function deleteActivity(activityId: number): Promise<void> {
  await pool.query("DELETE FROM activities WHERE id = $1", [activityId]);
}
