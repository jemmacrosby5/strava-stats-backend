// One-time (or re-runnable) backfill script.
// Pulls your full Strava activity history via the paginated
// "list athlete activities" endpoint and upserts each one into Postgres.
//
// Run with: npx tsx backfill.ts

import dotenv from "dotenv";
dotenv.config();

import { getAccessToken } from "./services/strava.js";
import { upsertActivity } from "./services/activities.js";
import type { StravaActivity } from "./types/strava.js";

const PER_PAGE = 200; // Strava's max page size

async function fetchActivityPage(
  token: string,
  page: number,
): Promise<StravaActivity[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (res.status === 429) {
    console.warn(
      "Hit Strava rate limit — waiting 15 minutes before retrying...",
    );
    await sleep(15 * 60 * 1000);
    return fetchActivityPage(token, page); // retry same page
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to fetch activities page ${page}: ${res.status} ${errText}`,
    );
  }

  return (await res.json()) as StravaActivity[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfill(): Promise<void> {
  const token = await getAccessToken();

  let page = 1;
  let totalSaved = 0;

  while (true) {
    console.log(`Fetching page ${page}...`);
    const activities = await fetchActivityPage(token, page);

    if (activities.length === 0) {
      console.log("No more activities — backfill complete.");
      break;
    }

    for (const activity of activities) {
      await upsertActivity(activity);
      totalSaved++;
    }

    console.log(
      `Saved ${activities.length} activities from page ${page} (running total: ${totalSaved})`,
    );
    page++;

    // Small pause between pages to be a good citizen with the API
    await sleep(500);
  }

  console.log(`Done. Total activities saved: ${totalSaved}`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
