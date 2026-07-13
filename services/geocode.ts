// Strava's own `location_country` field is unreliable — it's often null even
// when an activity has valid GPS data. Since we already have `start_latlng`
// on most outdoor activities, we derive the country ourselves using
// OpenStreetMap's free Nominatim reverse-geocoding service instead.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";

// Nominatim's usage policy requires a descriptive User-Agent and caps
// requests at 1/second — fine for a personal project's occasional use,
// but don't remove the delay or increase call frequency.
const USER_AGENT = "strava-stats-personal-app/1.0";

/**
 * Given a [lat, lng] pair, returns the country name, or null if it
 * can't be determined (missing coordinates, lookup failure, etc.)
 */
export async function getCountryFromLatLng(
  latlng: [number, number] | null | undefined,
): Promise<string | null> {
  if (!latlng || latlng.length !== 2) {
    return null;
  }

  const [lat, lon] = latlng;

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "User-Agent": USER_AGENT } },
    );

    if (!res.ok) {
      console.warn(
        `Nominatim lookup failed for [${lat}, ${lon}]: ${res.status}`,
      );
      return null;
    }

    const data = (await res.json()) as { address?: { country?: string } };
    return data.address?.country ?? null;
  } catch (err) {
    console.warn(`Nominatim lookup error for [${lat}, ${lon}]:`, err);
    return null;
  }
}

/** Simple sleep helper — used to respect Nominatim's 1 request/second limit */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
