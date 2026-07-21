// Read-only API for the React dashboard: overall stats, chart-friendly
// breakdowns, and a paginated raw activities list.

import express, { Request, Response, Router } from "express";
import {
  getStatsSummary,
  getBreakdownByDay,
  getBreakdownByMonth,
  getActivities,
} from "../services/stats.js";

const router: Router = express.Router();

// GET /api/stats/summary
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const summary = await getStatsSummary();
    res.json(summary);
  } catch (err) {
    console.error("Failed to get stats summary:", err);
    res.status(500).json({ error: "Failed to fetch stats summary" });
  }
});

// GET /api/stats/by-day
router.get("/stats/by-day", async (req: Request, res: Response) => {
  try {
    const breakdown = await getBreakdownByDay();
    res.json(breakdown);
  } catch (err) {
    console.error("Failed to get day breakdown:", err);
    res.status(500).json({ error: "Failed to fetch day breakdown" });
  }
});

// GET /api/stats/by-month
router.get("/stats/by-month", async (req: Request, res: Response) => {
  try {
    const breakdown = await getBreakdownByMonth();
    res.json(breakdown);
  } catch (err) {
    console.error("Failed to get month breakdown:", err);
    res.status(500).json({ error: "Failed to fetch month breakdown" });
  }
});

// GET /api/activities?limit=20&offset=0&type=Run
router.get("/activities", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100); // cap to avoid huge pulls
    const offset = Number(req.query.offset) || 0;
    const type =
      typeof req.query.type === "string" ? req.query.type : undefined;

    const activities = await getActivities({ limit, offset, type });
    res.json(activities);
  } catch (err) {
    console.error("Failed to get activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;
