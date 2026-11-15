import { config } from "../../config.js";
import { FakeProvider } from "./fake-provider.js";
import type { LLMProvider } from "./provider.js";

export function getProvider(): LLMProvider {
  if (config.LLM_PROVIDER === "fake") {
    return new FakeProvider(config.EMBEDDING_DIM);
  }
  if (!config.LLM_API_KEY) {
    throw new Error(`LLM_API_KEY is required for provider "${config.LLM_PROVIDER}"`);
  }
  // Real adapters (gemini/openai) added by user in Day 11 step 11.4
  throw new Error(`Provider "${config.LLM_PROVIDER}" adapter not implemented yet`);
}
