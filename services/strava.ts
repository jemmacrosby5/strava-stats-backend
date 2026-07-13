import pool from "../db.js";

const STRAVA_API_BASE =
  process.env.STRAVA_API_BASE ?? "https://www.strava.com/api/v3";

interface StravaAuthRow {
  access_token: string;
  refresh_token: string;
  expires_at: string | number | Date;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getAccessToken(): Promise<string> {
  const { rows } = await pool.query<StravaAuthRow>(
    "SELECT access_token, refresh_token, expires_at FROM strava_auth WHERE id = 1",
  );

  const row = rows[0];
  if (!row) {
    throw new Error("No Strava auth row found");
  }

  const { access_token, refresh_token, expires_at } = row;

  if (new Date(expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return access_token;
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Strava client credentials");
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  const data = (await res.json()) as StravaTokenResponse;

  await pool.query(
    `UPDATE strava_auth SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE id = 1`,
    [data.access_token, data.refresh_token, new Date(data.expires_at * 1000)],
  );

  return data.access_token;
}

export async function fetchActivity(
  activityId: string | number,
): Promise<unknown> {
  const token = await getAccessToken();

  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to fetch activity ${activityId}: ${res.status} ${errText}`,
    );
  }

  return res.json();
}
