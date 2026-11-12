import { describe, expect, it } from "vitest";
import { createMemorySchema } from "../src/schemas/memory.js";

const valid = {
  title: "First date",
  eventDate: "2024-02-14",
  visibility: "shared" as const,
};

describe("createMemorySchema", () => {
  it("rejects empty title", () => {
    const result = createMemorySchema.safeParse({ ...valid, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid visibility", () => {
    const result = createMemorySchema.safeParse({ ...valid, visibility: "public" });
    expect(result.success).toBe(false);
  });

  it("defaults tags to [] when omitted", () => {
    const result = createMemorySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual([]);
  });

  it("rejects invalid eventDate", () => {
    const result = createMemorySchema.safeParse({ ...valid, eventDate: "2024-13-01" });
    expect(result.success).toBe(false);
  });
});
