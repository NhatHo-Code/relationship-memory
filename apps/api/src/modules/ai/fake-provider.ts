import { createHash } from "node:crypto";
import type { ChatMessage, LLMProvider } from "./provider.js";

export class FakeProvider implements LLMProvider {
  readonly embeddingModel = "fake-hash-v1";
  lastMessages: ChatMessage[] = [];
  nextAnswer = JSON.stringify({ answer: "fake answer", found: true, sourceIds: [] });

  constructor(private readonly dim: number) {}

  async embed(texts: string[]) {
    return texts.map((t) => this.vectorize(t));
  }

  async generate(messages: ChatMessage[]) {
    this.lastMessages = messages;
    return this.nextAnswer;
  }

  private vectorize(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    const words = text
      .toLowerCase()
      .normalize("NFC")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    for (const w of words) {
      const bucket = createHash("md5").update(w).digest().readUInt32BE(0) % this.dim;
      v[bucket] = (v[bucket] ?? 0) + 1;
    }
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  }
}
