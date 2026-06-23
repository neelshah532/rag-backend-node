function testCitations() {
  const hits = [
    { url: "https://example.com/a", score: 0.9, text: "Chunk 1" },
    { url: "https://example.com/b", score: 0.8, text: "Chunk 2" },
    { url: "https://example.com/a", score: 0.7, text: "Chunk 3" }
  ];
  
  // What buildPrompt does currently:
  let promptContext = "";
  hits.forEach((h, i) => {
    promptContext += `\n[${i + 1}] (${h.url}):\n${h.text}\n`;
  });
  
  // What UI gets:
  const map = new Map<string, number>();
  for (const h of hits) {
    if (!map.has(h.url) || map.get(h.url)! < h.score) map.set(h.url, h.score);
  }
  const sources = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url);
    
  // NEW buildPrompt logic:
  const urlToId = new Map(sources.map((url, i) => [url, i + 1]));
  let newPromptContext = "";
  hits.forEach((h) => {
    newPromptContext += `\n[${urlToId.get(h.url)}] (${h.url}):\n${h.text}\n`;
  });
  
  console.log("--- Citation Alignment Check AFTER ---");
  console.log("Prompt markers:\n", newPromptContext);
  console.log("UI Sources (deduped):", sources);
}

testCitations();
