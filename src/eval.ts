import { runIndexing } from "./jobs.js";
import { retrieve } from "./rag/retrieve.js";
import { config } from "./config.js";

// Edit these for the site you're testing.
const SITE = process.env.EVAL_SITE ?? "https://posimyth.com/";
const CASES: { q: string; expect: string }[] = [
  { q: "What is NexterWP?", expect: "nexter" },
  { q: "Tell me about The Plus Addons for Elementor", expect: "plus-addons" },
  { q: "How do I bake a chocolate cake?", expect: "cake" }, // Off-topic
  { q: "Who won the superbowl in 2012?", expect: "superbowl" }, // Off-topic
];

async function main() {
  console.warn(`Indexing ${SITE} …`);
  await runIndexing(SITE, (state) => {
    if (state.status === "error") throw new Error(state.error);
  });

  let hits = 0;
  for (const c of CASES) {
    const { hits: results } = await retrieve(c.q);
    const urls = results.map((r) => r.url);
    const found = urls.some((u) => u.includes(c.expect));
    if (found) hits++;
    console.warn(`${found ? "✅" : "❌"}  "${c.q}"`);
    console.warn(`     top: ${urls[0] ?? "(none)"}  score: ${results[0]?.score.toFixed(3) ?? "-"}`);
  }
  console.warn(`\nRecall@${config.topK}: ${hits}/${CASES.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
