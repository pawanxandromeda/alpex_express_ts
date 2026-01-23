"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingTodosCount = exports.getTodoStats = exports.deleteTodo = exports.completeTodo = exports.getAllEmployees = exports.getTodosByUsername = exports.createTodo = void 0;
const postgres_1 = __importDefault(require("../../config/postgres"));
const createTodo = async (title, description, createdByUsername, assignedToUsername, priority, dueDate) => {
    return postgres_1.default.todo.create({
        data: {
            title,
            description,
            createdByUsername,
            assignedToUsername,
            priority: priority,
            dueDate,
        },
        include: {
            createdBy: {
                select: {
                    name: true,
                    username: true,
                    designation: true,
                    department: true,
                },
            },
            assignedTo: {
                select: {
                    name: true,
                    username: true,
                    designation: true,
                    department: true,
                },
            },
        },
    });
};
exports.createTodo = createTodo;
const getTodosByUsername = async (username, role) => {
    // If user is viewing their assigned todos
    if (role === 'assigned') {
        return postgres_1.default.todo.findMany({
            where: { assignedToUsername: username },
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
            include: {
                createdBy: {
                    select: {
                        name: true,
                        username: true,
                        designation: true,
                        department: true,
                    },
                },
                assignedTo: {
                    select: {
                        name: true,
                        username: true,
                        designation: true,
                        department: true,
                    },
                },
            },
        });
    }
    // Default: get todos created by user
    return postgres_1.default.todo.findMany({
        where: { createdByUsername: username },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
            createdBy: {
                select: {
                    name: true,
                    username: true,
                    designation: true,
                    department: true,
                },
            },
            assignedTo: {
                select: {
                    name: true,
                    username: true,
                    designation: true,
                    department: true,
                },
            },
        },
    });
};
exports.getTodosByUsername = getTodosByUsername;
const getAllEmployees = async () => {
    return postgres_1.default.employee.findMany({
        where: { status: 'Active' },
        select: {
            username: true,
            name: true,
            designation: true,
            department: true,
        },
        orderBy: { name: 'asc' },
    });
};
exports.getAllEmployees = getAllEmployees;
const completeTodo = async (id) => {
    return postgres_1.default.todo.update({
        where: { id },
        data: {
            completed: true,
            completedAt: new Date()
        },
    });
};
exports.completeTodo = completeTodo;
const deleteTodo = async (id) => {
    return postgres_1.default.todo.delete({
        where: { id },
    });
};
exports.deleteTodo = deleteTodo;
const getTodoStats = async (username) => {
    const [createdCount, assignedCount, completedCount] = await Promise.all([
        postgres_1.default.todo.count({
            where: { createdByUsername: username },
        }),
        postgres_1.default.todo.count({
            where: { assignedToUsername: username, completed: false },
        }),
        postgres_1.default.todo.count({
            where: {
                OR: [
                    { createdByUsername: username, completed: true },
                    { assignedToUsername: username, completed: true }
                ]
            },
        }),
    ]);
    return {
        createdCount,
        assignedCount,
        completedCount,
        total: createdCount + assignedCount,
    };
};
exports.getTodoStats = getTodoStats;
const getPendingTodosCount = async () => {
    return postgres_1.default.todo.count({
        where: { completed: false },
    });
};
exports.getPendingTodosCount = getPendingTodosCount;
