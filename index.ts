import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import pool from "./db.js";
import webhookRoute from "./routes/webhook.js";
import apiRoute from "./routes/api.js";
import { requireApiKey } from "./middleware/index.js";

const app = express();
app.use(express.json());

// Only allow requests from your own frontend's origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // e.g. https://your-dashboard.com or your S3/CloudFront URL
  }),
);

// Simple health check — useful for confirming the app + DB are both alive
app.get("/health", async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    res
      .status(500)
      .json({ status: "error", db: "disconnected", error: message });
  }
});

// Strava webhook — deliberately NOT behind the API key, since Strava itself
// calls this and can't send a custom header we control
app.use("/webhook", webhookRoute);

// Everything the frontend calls IS behind the API key
app.use("/api", requireApiKey, apiRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
