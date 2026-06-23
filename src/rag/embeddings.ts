import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

// Load the pipeline once
const _pipeline = pipeline as any;
const getExtractor = async () => {
  if (!extractorPromise) {
    extractorPromise = _pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractorPromise;
};

/** Embed a batch of texts → array of 384-dim normalized vectors. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await (extractor as any)(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec;
}
