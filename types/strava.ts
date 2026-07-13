export interface StravaAuthRow {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export interface StravaTokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time?: number;
  start_date: string;
  total_elevation_gain: number;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  location_country?: string | null;
  start_latlng?: [number, number] | null;
  [key: string]: unknown;
}

// Shape of the payload Strava POSTs to webhook endpoint on any
// activity create/update/delete event
export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}
