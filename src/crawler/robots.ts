import robotsParser from "robots-parser";
import { config } from "../config.js";

export async function loadRobots(siteUrl: string) {
  const { origin } = new URL(siteUrl);
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      headers: { "user-agent": config.userAgent },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
    const body = res.ok ? await res.text() : "";
    return robotsParser(robotsUrl, body);
  } catch {
    // No robots.txt (or it failed to load) → treat as allow-all, but we still rate-limit.
    return robotsParser(robotsUrl, "");
  }
}
