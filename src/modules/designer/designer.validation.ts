import { z } from "zod";

export const designActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comments: z.string().optional(),
});
