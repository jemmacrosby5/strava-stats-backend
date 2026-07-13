export async function getAccessToken() {
  const { rows } = await pool.query('SELECT * FROM strava_auth WHERE id = 1');
  const { access_token, refresh_token, expires_at } = rows[0];

  // if token is still valid for the next 5+ minutes, just reuse it
  if (new Date(expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return access_token;
  }

  // otherwise, refresh it
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
  });
  const data = await res.json();

  await pool.query(
    `UPDATE strava_auth SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE id = 1`,
    [data.access_token, data.refresh_token, new Date(data.expires_at * 1000)]
  );

  return data.access_token;
}


/**
 * Fetches full details for a single activity from Strava's API.
 * Used after a webhook event.
 */
export async function fetchActivity(activityId) {
  const token = await getValidAccessToken();
 
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
 
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch activity ${activityId}: ${res.status} ${errText}`);
  }
 
  return res.json();
}