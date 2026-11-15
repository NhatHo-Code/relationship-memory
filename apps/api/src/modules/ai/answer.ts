import { z } from "zod";

export const answerSchema = z.object({
  answer: z.string(),
  found: z.boolean(),
  sourceIds: z.array(z.string()),
});
export type Answer = z.infer<typeof answerSchema>;
