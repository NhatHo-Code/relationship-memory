import { z } from "zod";

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatSource {
  memoryId: string;
  title: string;
  eventDate: string;
}

export interface ChatResponse {
  answer: string;
  found: boolean;
  sources: ChatSource[];
}
