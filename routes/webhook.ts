// Strava webhook route — handles both:
// 1) the one-time GET verification Strava sends when a subscription is created
// 2) the POST events Strava sends whenever an activity is created/updated/deleted

import express, { Request, Response, Router } from "express";
import { fetchActivity } from "../services/strava.js";
import { upsertActivity, deleteActivity } from "../services/activities.js";
import type { StravaWebhookEvent, StravaActivity } from "../types/strava.js";

const router: Router = express.Router();

// Strava calls this once, with ?hub.challenge=xxx, to confirm I own the URL
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
    return res.json({ "hub.challenge": challenge });
  }

  return res.sendStatus(403);
});

// Strava calls this every time an activity changes
router.post("/", (req: Request, res: Response) => {
  // Always ack immediately — Strava retries if it doesn't get a fast 200,
  // so we respond first and do the actual work afterward
  res.sendStatus(200);

  const event = req.body as StravaWebhookEvent;

  // Only care about activities not account-level events
  if (event.object_type !== "activity") {
    return;
  }

  handleActivityEvent(event).catch((err) => {
    console.error("Failed to process webhook event:", err);
  });
});

async function handleActivityEvent(event: StravaWebhookEvent): Promise<void> {
  if (event.aspect_type === "delete") {
    await deleteActivity(event.object_id);
    console.log(`Deleted activity ${event.object_id}`);
    return;
  }

  // 'create' or 'update' — fetch the full activity and upsert it
  const activity = (await fetchActivity(event.object_id)) as StravaActivity;
  await upsertActivity(activity);
  console.log(`Saved activity ${activity.id} (${activity.name})`);
}

export default router;
