"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingTodosCountController = exports.deleteTodoController = exports.completeTodoController = exports.getAllEmployeesController = exports.getTodosController = exports.createTodoController = void 0;
const service = __importStar(require("./todo.service"));
const createTodoController = async (req, res) => {
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
        const todo = await service.createTodo(title, description, createdByUsername, assignedToUsername, priority, dueDate ? new Date(dueDate) : undefined);
        res.status(201).json({
            success: true,
            data: todo,
            message: "Todo created successfully",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTodoController = createTodoController;
const getTodosController = async (req, res) => {
    const { username, role } = req.query;
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
exports.getTodosController = getTodosController;
const getAllEmployeesController = async (req, res) => {
    const employees = await service.getAllEmployees();
    res.json({
        success: true,
        data: employees,
        count: employees.length,
        message: "Employees fetched successfully"
    });
};
exports.getAllEmployeesController = getAllEmployeesController;
const completeTodoController = async (req, res) => {
    const { id } = req.params;
    try {
        const todo = await service.completeTodo(id);
        res.json({ success: true, data: todo, message: "Todo marked as completed" });
    }
    catch (err) {
        res.status(404).json({ success: false, message: "Todo not found" });
    }
};
exports.completeTodoController = completeTodoController;
const deleteTodoController = async (req, res) => {
    const { id } = req.params;
    try {
        await service.deleteTodo(id);
        res.json({ success: true, data: { id }, message: "Todo deleted successfully" });
    }
    catch (err) {
        res.status(404).json({ success: false, message: "Todo not found" });
    }
};
exports.deleteTodoController = deleteTodoController;
const getPendingTodosCountController = async (req, res) => {
    try {
        const count = await service.getPendingTodosCount();
        res.json({ success: true, data: { count }, message: "Pending todos count fetched successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingTodosCountController = getPendingTodosCountController;
