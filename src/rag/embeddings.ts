const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "cant", "cannot", "could", "couldnt",
  "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during",
  "each",
  "few", "for", "from", "further",
  "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows",
  "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself",
  "lets",
  "me", "more", "most", "mustnt", "my", "myself",
  "no", "nor", "not",
  "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
  "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such",
  "than", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", "to", "too",
  "under", "until", "up", "very",
  "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt",
  "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
]);

let vocabulary: string[] = [];
let idf: Map<string, number> = new Map();

// Tokenize text: split by non-alphanumeric, lowercase, filter out stop words and short tokens
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Initialize vocabulary and IDF from all document texts globally. */
export function initEmbeddings(allTexts: string[]) {
  vocabulary = [];
  idf.clear();

  const termDocCounts = new Map<string, number>();
  const totalDocs = allTexts.length;

  for (const text of allTexts) {
    const tokens = tokenize(text);
    const uniqueTokens = new Set(tokens);
    for (const t of uniqueTokens) {
      termDocCounts.set(t, (termDocCounts.get(t) ?? 0) + 1);
    }
  }

  vocabulary = Array.from(termDocCounts.keys());

  // Compute IDF for each term: log(1 + totalDocs / (1 + docFreq))
  for (const [term, freq] of termDocCounts.entries()) {
    idf.set(term, Math.log(1 + totalDocs / (1 + freq)));
  }
}

/** Embed a batch of texts → array of L2-normalized TF-IDF vectors. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Fallback if not initialized
  if (vocabulary.length === 0) {
    initEmbeddings(texts);
  }

  const vectors: number[][] = [];
  for (const text of texts) {
    const tokens = tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }

    const totalTokens = tokens.length || 1;
    const vector = new Array(vocabulary.length).fill(0);

    for (let i = 0; i < vocabulary.length; i++) {
      const term = vocabulary[i];
      const termTf = (tf.get(term) ?? 0) / totalTokens;
      const termIdf = idf.get(term) ?? 0;
      vector[i] = termTf * termIdf;
    }

    // Normalize vector (L2 norm) so dot product acts as cosine similarity
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }

    vectors.push(vector);
  }

  return vectors;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec || new Array(vocabulary.length).fill(0);
}
