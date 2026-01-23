import { Request, Response } from "express";
import * as service from "./todo.service";

export const createTodoController = async (req: Request, res: Response) => {
  try {
    const { title, description, createdByUsername, assignedToUsername, priority, dueDate } = req.body;

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
      dueDate ? new Date(dueDate) : undefined
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
  const { username, role } = req.query as { username: string; role?: string };
  
  const todos = await service.getTodosByUsername(username, role);
  const stats = await service.getTodoStats(username);
  
  res.json({ 
    success: true, 
    data: todos, 
    stats,
    count: todos.length, 
    message: "Todos fetched successfully" 
  });
};

export const getAllEmployeesController = async (req: Request, res: Response) => {
  const employees = await service.getAllEmployees();
  res.json({ 
    success: true, 
    data: employees, 
    count: employees.length, 
    message: "Employees fetched successfully" 
  });
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

export const deleteTodoController = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await service.deleteTodo(id);
    res.json({ success: true, data: { id }, message: "Todo deleted successfully" });
  } catch (err) {
    res.status(404).json({ success: false, message: "Todo not found" });
  }
};

export const getPendingTodosCountController = async (req: Request, res: Response) => {
  try {
    const count = await service.getPendingTodosCount();
    res.json({ success: true, data: { count }, message: "Pending todos count fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};