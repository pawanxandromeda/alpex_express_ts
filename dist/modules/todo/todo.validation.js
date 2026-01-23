"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todoIdSchema = exports.getTodosSchema = exports.createTodoSchema = void 0;
const zod_1 = require("zod");
/* ---------- CREATE TODO (POST) ---------- */
exports.createTodoSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().max(500).optional().default(""),
        createdByUsername: zod_1.z.string().min(1),
        assignedToUsername: zod_1.z.string().optional().nullable(),
        priority: zod_1.z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
    }),
});
/* ---------- GET TODOS (GET) ---------- */
exports.getTodosSchema = zod_1.z.object({
    query: zod_1.z.object({
        username: zod_1.z.string().min(1, "Username is required"),
        role: zod_1.z.enum(["created", "assigned"]).optional(),
    }),
});
/* ---------- TODO ID PARAM ---------- */
exports.todoIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid("Invalid todo ID"),
    }),
});
