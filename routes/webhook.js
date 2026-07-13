// Strava webhook route — handles both:
// 1) the one-time GET verification Strava sends when you create a subscription
// 2) the POST events Strava sends whenever an activity is created/updated/deleted
//
// This is a placeholder for now — full logic (fetching the activity and
// saving it to the activities table) comes in the next step.
import express from "express";
const router = express.Router();
export default router;
// Strava calls this once, with ?hub.challenge=xxx, to confirm you own the URL
router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
        return res.json({ "hub.challenge": challenge });
    }
    return res.sendStatus(403);
});
// Strava calls this every time an activity changes
router.post("/", (req, res) => {
    // Always ack immediately — Strava retries if it doesn't get a fast 200
    res.sendStatus(200);
    console.log("Webhook event received:", req.body);
    // TODO next step: look up the activity via fetchActivity() and store it
});
