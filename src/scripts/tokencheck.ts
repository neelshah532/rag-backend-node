import { AutoTokenizer } from "@huggingface/transformers";
import { chunkPage } from "../rag/chunk.js";
import { config } from "../config.js";

async function main() {
  const tokenizer = await AutoTokenizer.from_pretrained("Xenova/all-MiniLM-L6-v2");
  
  const res = await fetch("https://en.wikipedia.org/wiki/React_(software)");
  const html = await res.text();
  const { extractPage } = await import("../crawler/extract.js");
  const { doc } = extractPage("https://en.wikipedia.org/wiki/React_(software)", html);
  
  const chunks = chunkPage(doc);
  
  let min = Infinity, max = 0, sum = 0;
  let over256 = 0;
  
  const counts = await Promise.all(chunks.map(async (c) => {
    const tokens = await tokenizer(c.text);
    return tokens.input_ids.data.length; // rough token count
  }));
  
  for (const c of counts) {
    if (c < min) min = c;
    if (c > max) max = c;
    sum += c;
    if (c > 256) over256++;
  }
  
  const median = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)];
  
  console.log("--- Token Check BEFORE ---");
  console.log(`Chunks: ${counts.length}`);
  console.log(`Min: ${min}`);
  console.log(`Median: ${median}`);
  console.log(`Max: ${max}`);
  console.log(`Over 256: ${over256} (${((over256 / counts.length) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
