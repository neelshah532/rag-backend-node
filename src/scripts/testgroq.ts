import { Groq } from "groq-sdk";
import { config } from "../config.js";
import dotenv from "dotenv";
dotenv.config();

async function testGroq() {
  console.log("Using API Key:", process.env.GROQ_API_KEY);
  console.log("Using Model:", process.env.GEN_MODEL || "llama3-8b-8192");
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const stream = await groq.chat.completions.create({
      model: process.env.GEN_MODEL || "llama3-8b-8192",
      messages: [{ role: "user", content: "Say hello!" }],
      stream: true,
    });
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }
  } catch (e: any) {
    console.error("\nGROQ ERROR:", e);
    console.error("Message:", e.message);
  }
}
testGroq();
