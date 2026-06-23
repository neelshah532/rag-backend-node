import { Groq } from 'groq-sdk';
import { config } from '../config.js';

const groq = new Groq({ apiKey: config.groqApiKey });

export async function generateAnswer(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: config.genModel,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.choices[0]?.message?.content ?? '';
}

/** Streaming version — yields text tokens as they arrive (Stretch Goal). */
export async function* generateAnswerStream(prompt: string): AsyncGenerator<string> {
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
