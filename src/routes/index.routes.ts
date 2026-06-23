import { Router } from "express";
import { startIndexing, getJob } from "../jobs.js";

export const indexRouter = Router();

indexRouter.post("/index", (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Provide a 'url' string." });
  }
  // Fire-and-forget; the client polls /index/status for progress.
  void startIndexing(url);
  res.json({ ok: true });
});

indexRouter.get("/index/status", (_req, res) => {
  res.json(getJob());
});
