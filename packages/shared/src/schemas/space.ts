import { z } from "zod";

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

export const spaceIdParamsSchema = z.object({ spaceId: z.uuid() });
export const acceptInvitationSchema = z.object({ token: z.string().min(20).max(200) });
