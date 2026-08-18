import { Groq } from 'groq-sdk';
import { config } from '../config.js';

function getGroqClient() {
  const apiKey = config.groqApiKey || process.env.GROQ_API_KEY || '';
  return new Groq({ apiKey });
}

export async function generateAnswer(prompt: string): Promise<string> {
  const groq = getGroqClient();
  const res = await groq.chat.completions.create({
    model: config.genModel,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.choices[0]?.message?.content ?? '';
}

/** Streaming version — yields text tokens as they arrive (Stretch Goal). */
export async function* generateAnswerStream(prompt: string): AsyncGenerator<string> {
  const groq = getGroqClient();
  const stream = await groq.chat.completions.create({
    model: config.genModel,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
