import { Router } from "express";
import {
  createTodoController,
  getTodosController,
  getTodoByIdController,
  updateTodoController,
  addTodoUpdateController,
  getTodoUpdatesController,
  getActiveEmployeesController,
  completeTodoController,
  deleteTodoController,
  getPendingTodosCountController,
} from "./todo.controller";
import {
  createTodoSchema,
  getTodosSchema,
  todoIdSchema,
  updateTodoSchema,
  addUpdateSchema,
  getEmployeesSchema,
} from "./todo.validation";
import { validate } from "../../common/middleware/zod.validate";

const router = Router();

// Create a new todo
router.post("/create", validate(createTodoSchema), createTodoController);

// Get all todos for a user (created, assigned, mentioned, or all)
router.get("/", validate(getTodosSchema), getTodosController);

// Get a specific todo by ID
router.get("/:id", validate(todoIdSchema), getTodoByIdController);

// Get active employees (only those in todos)
router.get("/employees/list", getActiveEmployeesController);

// Update a todo
router.put("/:id", validate(updateTodoSchema), updateTodoController);

// Add an update/comment to a todo
router.post("/:id/updates", validate(addUpdateSchema), addTodoUpdateController);

// Get all updates for a todo
router.get("/:id/updates", validate(todoIdSchema), getTodoUpdatesController);

// Mark todo as completed
router.patch("/:id/complete", validate(todoIdSchema), completeTodoController);

// Delete a todo
router.delete("/:id", validate(todoIdSchema), deleteTodoController);

// Get pending todos count for logged-in user
router.get("/pending/count", getPendingTodosCountController);

export default router;