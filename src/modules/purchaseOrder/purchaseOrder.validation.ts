import { z } from "zod";

export const createPOSchema = z.object({
  poNo: z.string(),
  gstNo: z.string(),
  poDate: z.date().optional(),
  overallStatus: z.string().optional(),
});
