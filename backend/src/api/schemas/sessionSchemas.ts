import { z } from "zod";
import { personalWishesStateSchema } from "../../domain";

/**
 * Schema for optional custom initial state in POST /api/sessions.
 */
export const createSessionBodySchema = z
  .object({
    initialState: personalWishesStateSchema.optional(),
  })
  .optional();

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;

/**
 * Schema for session path parameter :id.
 */
export const sessionIdParamSchema = z.object({
  id: z.string().trim().min(1, "Session ID cannot be empty"),
});

export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;

/**
 * Schema for POST /api/sessions/:id/messages request payload matching ARCHITECTURE.md Section 9.2.
 */
export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1, "Message content cannot be empty"),
});

export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
