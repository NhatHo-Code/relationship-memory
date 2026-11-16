// apps/api/src/modules/ai/gemini-provider.ts
import type { LLMProvider, ChatMessage } from "./provider.js";

export class GeminiProvider implements LLMProvider {
  readonly embeddingModel = "gemini-embedding-001"; // or gemini-embedding-exp-03-07

  constructor(private readonly apiKey: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
        }
      );
      const json = await res.json() as { embedding?: { values: number[] }; error?: unknown };
      if (!json.embedding) throw new Error(`Gemini embed failed: ${JSON.stringify(json)}`);
      results.push(json.embedding.values);
    }
    return results;
  }

  async generate(messages: ChatMessage[]): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );
    const json = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini generate failed: ${JSON.stringify(json)}`);
    return text;
  }
}