import * as cheerio from "cheerio";
import type { PageDoc } from "../types.js";

const STRIP = ["script", "style", "noscript", "nav", "header", "footer", "aside", "form", "svg", "iframe", "button"];

export function extractContent(url: string, html: string): PageDoc {
  const $ = cheerio.load(html);

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    url;

  // Remove obvious boilerplate
  STRIP.forEach((sel) => $(sel).remove());
  $('[role="navigation"], [aria-hidden="true"], .cookie, .cookie-banner, #cookie, .newsletter').remove();

  // Prefer semantic main content if the page has it
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");

  const text = root.text().replace(/\s+/g, " ").trim();
  return { url, title, text };
}

export function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });
  return links;
}
