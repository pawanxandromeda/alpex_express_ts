import { Request, Response } from "express";
import * as service from "./todo.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";

export const createTodoController = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      createdByUsername,
      assignedToUsername,
      priority,
      status,
      dueDate,
      mentionedUsernames,
    } = req.body;

    if (!title || !createdByUsername) {
      return res.status(400).json({
        success: false,
        errors: [
          { path: ["title"], message: "Title is required" },
          { path: ["createdByUsername"], message: "CreatedByUsername is required" },
        ],
      });
    }

    const todo = await service.createTodo(
      title,
      description,
      createdByUsername,
      assignedToUsername,
      priority,
      status,
      dueDate ? new Date(dueDate) : undefined,
      mentionedUsernames
    );

    res.status(201).json({
      success: true,
      data: todo,
      message: "Todo created successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodosController = async (req: Request, res: Response) => {
  try {
    const { username, type } = req.query as { username: string; type?: string };

    const todos = await service.getTodosByUsername(username, type);
    const stats = await service.getTodoStats(username);

    res.json({
      success: true,
      data: todos,
      stats,
      count: todos.length,
      message: "Todos fetched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodoByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const todo = await service.getTodoById(id as string);

    if (!todo) {
      return res.status(404).json({ success: false, message: "Todo not found" });
    }

    res.json({
      success: true,
      data: todo,
      message: "Todo fetched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTodoController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      assignedToUsername,
      dueDate,
      mentionedUsernames,
    } = req.body;

    const todo = await service.updateTodo(id as string, {
      title,
      description,
      priority,
      status,
      assignedToUsername,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      mentionedUsernames,
    });

    res.json({
      success: true,
      data: todo,
      message: "Todo updated successfully",
    });
  } catch (error: any) {
    res.status(error.message === "Todo not found" ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addTodoUpdateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, updateType } = req.body;

    const todo = await service.addTodoUpdate(id as string, description, updateType);

    res.json({
      success: true,
      data: todo,
      message: "Update added successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodoUpdatesController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = await service.getTodoUpdates(id as string);

    res.json({
      success: true,
      data: updates,
      count: updates.length,
      message: "Updates fetched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveEmployeesController = async (req: Request, res: Response) => {
  try {
    const employees = await service.getActiveEmployeesInTodos();
    res.json({
      success: true,
      data: employees,
      count: employees.length,
      message: "Active employees in todos fetched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeTodoController = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const todo = await service.completeTodo(id);
    res.json({ success: true, data: todo, message: "Todo marked as completed" });
  } catch (err) {
    res.status(404).json({ success: false, message: "Todo not found" });
  }
};

export const deleteTodoController = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    await service.deleteTodo(id as string, userId);

    res.json({
      success: true,
      data: { id },
      message: "Todo deleted successfully",
    });
  } catch (err: any) {
    if (err.message === "Todo not found") {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    if (err.message === "You are not allowed to delete this todo") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this todo",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete todo",
    });
  }
};

export const getPendingTodosCountController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query as { username?: string };
    const count = await service.getPendingTodosCount(username);
    res.json({
      success: true,
      data: { count },
      message: "Pending todos count fetched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};