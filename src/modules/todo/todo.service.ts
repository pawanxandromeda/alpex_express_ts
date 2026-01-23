import prisma from "../../config/postgres";

export const createTodo = async (
  title: string,
  description: string,
  createdByUsername: string,
  assignedToUsername?: string,
  priority?: string,
  dueDate?: Date
) => {
  return prisma.todo.create({
    data: {
      title,
      description,
      createdByUsername,
      assignedToUsername,
      priority: priority as any,
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

export const getTodosByUsername = async (username: string, role?: string) => {
  // If user is viewing their assigned todos
  if (role === 'assigned') {
    return prisma.todo.findMany({
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
  return prisma.todo.findMany({
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

export const getAllEmployees = async () => {
  return prisma.employee.findMany({
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

export const completeTodo = async (id: string) => {
  return prisma.todo.update({
    where: { id },
    data: { 
      completed: true,
      completedAt: new Date()
    },
  });
};

export const deleteTodo = async (id: string) => {
  return prisma.todo.delete({
    where: { id },
  });
};

export const getTodoStats = async (username: string) => {
  const [createdCount, assignedCount, completedCount] = await Promise.all([
    prisma.todo.count({
      where: { createdByUsername: username },
    }),
    prisma.todo.count({
      where: { assignedToUsername: username, completed: false },
    }),
    prisma.todo.count({
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

export const getPendingTodosCount = async () => {
  return prisma.todo.count({
    where: { completed: false },
  });
};