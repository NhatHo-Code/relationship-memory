import { describe, expect, it } from "vitest";
import { chunkText } from "../src/modules/ai/chunk.js";

describe("chunkText", () => {
  it("short text → 1 chunk", () => {
    const chunks = chunkText("Hello world");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world");
  });

  it("multiple paragraphs under limit → merged into one chunk", () => {
    const text = "Para one.\n\nPara two.\n\nPara three.";
    const chunks = chunkText(text, 1500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("Para one.");
    expect(chunks[0]).toContain("Para three.");
  });

  it("paragraphs exceeding limit → split into multiple chunks", () => {
    const para = "x".repeat(600);
    const text = [para, para, para].join("\n\n");
    const chunks = chunkText(text, 1500);
    expect(chunks.length).toBeGreaterThan(1);
    const total = chunks.reduce((s, c) => s + c.length, 0);
    expect(total).toBeGreaterThanOrEqual(para.length * 3 - 10);
  });

  it("single paragraph 4000 chars → 3 chunks with maxChars=1500", () => {
    const text = "a".repeat(4000);
    const chunks = chunkText(text, 1500);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.length).toBe(1500);
    expect(chunks[1]!.length).toBe(1500);
    expect(chunks[2]!.length).toBe(1000);
  });
});
