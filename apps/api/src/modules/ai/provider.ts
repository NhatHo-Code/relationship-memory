export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  readonly embeddingModel: string;
  embed(texts: string[]): Promise<number[][]>;
  generate(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string>;
}
