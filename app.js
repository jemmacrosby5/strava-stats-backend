import dotenv from "dotenv";
dotenv.config();
import express from "express";
import pool from "./db.js";
import webhookRoute from "./routes/webhook.js";
const app = express();
app.use(express.json());
// Simple health check — useful for confirming the app + DB are both alive
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", db: "connected" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        res
            .status(500)
            .json({ status: "error", db: "disconnected", error: message });
    }
});
app.use("/webhook", webhookRoute);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
