import { z } from "zod";

/* ---------- CREATE TODO (POST) ---------- */
export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional().default(""),
    createdByUsername: z.string().min(1),
    assignedToUsername: z.string().optional().nullable(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
    status: z.enum(["Open", "InProgress", "OnHold", "Completed", "Cancelled"]).default("Open"),
    dueDate: z.string().datetime().optional().nullable(),
    mentionedUsernames: z.array(z.string()).optional().default([]),
  }),
});

/* ---------- GET TODOS (GET) ---------- */
export const getTodosSchema = z.object({
  query: z.object({
    username: z.string().min(1, "Username is required"),
    type: z.enum(["created", "assigned", "mentioned", "all"]).default("all").optional(),
  }),
});

/* ---------- TODO ID PARAM ---------- */
export const todoIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid todo ID"),
  }),
});

/* ---------- UPDATE TODO (PUT) ---------- */
export const updateTodoSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid todo ID"),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
    status: z.enum(["Open", "InProgress", "OnHold", "Completed", "Cancelled"]).optional(),
    assignedToUsername: z.string().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    mentionedUsernames: z.array(z.string()).optional(),
  }),
});

/* ---------- ADD UPDATE/COMMENT (POST) ---------- */
export const addUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid todo ID"),
  }),
  body: z.object({
    description: z.string().min(1).max(500),
    updateType: z.enum(["comment", "status_change", "assignment", "mention_added", "mention_removed"]).default("comment"),
  }),
});

/* ---------- GET EMPLOYEES ---------- */
export const getEmployeesSchema = z.object({
  query: z.object({
    todoId: z.string().uuid().optional(),
  }),
});
