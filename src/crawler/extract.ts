import * as cheerio from "cheerio";
import type { PageDoc } from "../types.js";

const STRIP = ["script","style","noscript","nav","header","footer","aside","form","svg","iframe","button"];

export interface ExtractResult { doc: PageDoc; links: string[]; }

export function extractPage(url: string, html: string): ExtractResult {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || $("h1").first().text().trim() || url;

  const links: string[] = [];
  $("a[href]").each((_, el) => { const h = $(el).attr("href"); if (h) links.push(h); });

  STRIP.forEach((sel) => $(sel).remove());
  $('[role="navigation"], [aria-hidden="true"], .cookie, .cookie-banner, #cookie, .newsletter').remove();
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");
  const text = root.text().replace(/\s+/g, " ").trim();

  return { doc: { url, title, text }, links };
}
