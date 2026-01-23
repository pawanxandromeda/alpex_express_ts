import { z } from "zod";

/* ---------- CREATE TODO (POST) ---------- */
export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional().default(""),
    createdByUsername: z.string().min(1),
    assignedToUsername: z.string().optional().nullable(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
    dueDate: z.string().datetime().optional().nullable(),
  }),
});

/* ---------- GET TODOS (GET) ---------- */
export const getTodosSchema = z.object({
  query: z.object({
    username: z.string().min(1, "Username is required"),
    role: z.enum(["created", "assigned"]).optional(),
  }),
});

/* ---------- TODO ID PARAM ---------- */
export const todoIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid todo ID"),
  }),
});
