import { Router } from "express";
import { runIndexing } from "../jobs.js";

export const indexRouter = Router();

indexRouter.post("/index", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "Provide a 'url' string." });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    await runIndexing(url, (state) => send("progress", state));
    send("done", { ok: true });
  } catch (e) {
    send("error", { message: (e as Error).message });
  } finally {
    res.end();
  }
});
