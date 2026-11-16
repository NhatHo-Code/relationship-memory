import { config } from "../../config.js";
import { FakeProvider } from "./fake-provider.js";
import { GeminiProvider } from "./gemini-provider.js";   // thêm dòng này
import type { LLMProvider } from "./provider.js";

export function getProvider(): LLMProvider {
  if (config.LLM_PROVIDER === "fake") {
    return new FakeProvider(config.EMBEDDING_DIM);
  }
  if (!config.LLM_API_KEY) {
    throw new Error(`LLM_API_KEY is required for provider "${config.LLM_PROVIDER}"`);
  }
  if (config.LLM_PROVIDER === "gemini") {          // thêm block này
    return new GeminiProvider(config.LLM_API_KEY);
  }
  throw new Error(`Provider "${config.LLM_PROVIDER}" adapter not implemented yet`);
}