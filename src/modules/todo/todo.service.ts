import prisma from "../../config/postgres";

// Helper: Get employee ID from username
const getEmployeeIdFromUsername = async (username: string) => {
  const employee = await prisma.employee.findUnique({
    where: { username: username },
    select: { id: true },
  });
  console.log(`🔍 Looking up employee ID for username "${username}": ${employee?.id}`);
  return employee?.id;
};

// Helper: Get username from employee ID
const getUsernameFromId = async (id: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { username: true },
  });
  return employee?.username;
};

export const createTodo = async (
  title: string,
  description: string,
  createdByUsername: string,
  assignedToUsername?: string,
  priority?: string,
  status?: string,
  dueDate?: Date,
  mentionedUsernames?: string[]
) => {
  const createdById = await getEmployeeIdFromUsername(createdByUsername);
  if (!createdById) {
    throw new Error("Creator employee not found");
  }

  let assignedToId: string | undefined;
  if (assignedToUsername) {
    assignedToId = await getEmployeeIdFromUsername(assignedToUsername);
    if (!assignedToId) {
      throw new Error("Assigned employee not found");
    }
  }

  const todo = await prisma.todo.create({
    data: {
      title,
      description,
      createdById,
      assignedToId,
      priority: priority as any,
      status: status as any,
      dueDate,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      mentionedEmployees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              department: true,
            },
          },
        },
      },
    },
  });

  // Add mentioned employees
  if (mentionedUsernames && mentionedUsernames.length > 0) {
    for (const username of mentionedUsernames) {
      const employeeId = await getEmployeeIdFromUsername(username);
      if (employeeId && employeeId !== createdById && employeeId !== assignedToId) {
        await prisma.todoMention.create({
          data: {
            todoId: todo.id,
            employeeId,
          },
        });
      }
    }
  }

  // Add creation update
  await prisma.todoUpdate.create({
    data: {
      todoId: todo.id,
      description: `Todo created with priority ${priority || 'Medium'}`,
      updateType: "status_change",
      newValue: status || "Open",
    },
  });

  return prisma.todo.findUnique({
    where: { id: todo.id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      mentionedEmployees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              department: true,
            },
          },
        },
      },
      updates: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getTodosByUsername = async (username: string, type?: string) => {
  const userId = await getEmployeeIdFromUsername(username);
  if (!userId) {
    throw new Error("User not found");
  }

  let whereClause: any = {};

  switch (type) {
    case "created":
      whereClause = { createdById: userId };
      break;
    case "assigned":
      whereClause = { assignedToId: userId, completed: false };
      break;
    case "mentioned":
      whereClause = {
        mentionedEmployees: {
          some: { employeeId: userId },
        },
      };
      break;
    case "all":
    default:
      // Show todos created by user, assigned to user, or mentioned
      whereClause = {
        OR: [
          { createdById: userId },
          { assignedToId: userId },
          {
            mentionedEmployees: {
              some: { employeeId: userId },
            },
          },
        ],
      };
      break;
  }

  return prisma.todo.findMany({
    where: whereClause,
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      mentionedEmployees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              department: true,
            },
          },
        },
      },
      updates: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
};

export const getTodoById = async (id: string) => {
  return prisma.todo.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          department: true,
        },
      },
      mentionedEmployees: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              username: true,
          role: true,
              department: true,
            },
          },
        },
      },
      updates: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getActiveEmployeesInTodos = async (todoId?: string) => {
  // Get employees who have created or been mentioned in todos
  const employees = await prisma.employee.findMany({
    where: {
      status: "Active",
      OR: [
        { createdTodos: { some: {} } },
        { mentionedInTodos: { some: {} } },
        { assignedTodos: { some: {} } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      department: true,
    },
    orderBy: { name: "asc" },
  });

  return employees;
};

export const completeTodo = async (id: string) => {
  const todo = await prisma.todo.update({
    where: { id },
    data: {
      completed: true,
      completedAt: new Date(),
      status: "Completed",
    },
  });

  // Log update
  await prisma.todoUpdate.create({
    data: {
      todoId: id,
      description: "Todo marked as completed",
      updateType: "status_change",
      oldValue: todo.status,
      newValue: "Completed",
    },
  });

  return getTodoById(id);
};

export const updateTodo = async (
  id: string,
  updates: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedToUsername?: string | null;
    dueDate?: Date | null;
    mentionedUsernames?: string[];
  }
) => {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) {
    throw new Error("Todo not found");
  }

  let assignedToId: string | null = todo.assignedToId ?? null;
  if (updates.assignedToUsername !== undefined) {
    if (updates.assignedToUsername) {
      assignedToId = (await getEmployeeIdFromUsername(updates.assignedToUsername)) ?? null;
      if (!assignedToId) {
        throw new Error("Assigned employee not found");
      }
    } else {
      assignedToId = null;
    }
  }

  const updateData: any = {};
  if (updates.title) updateData.title = updates.title;
  if (updates.description) updateData.description = updates.description;
  if (updates.priority) updateData.priority = updates.priority;
  if (updates.status) updateData.status = updates.status;
  if (updates.assignedToUsername !== undefined) updateData.assignedToId = assignedToId;
  if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;

  const updatedTodo = await prisma.todo.update({
    where: { id },
    data: updateData,
  });

  // Log status change
  if (updates.status && updates.status !== todo.status) {
    await prisma.todoUpdate.create({
      data: {
        todoId: id,
        description: `Status changed from ${todo.status} to ${updates.status}`,
        updateType: "status_change",
        oldValue: todo.status,
        newValue: updates.status,
      },
    });
  }

  // Log assignment change
  if (updates.assignedToUsername !== undefined) {
    const newAssignee = assignedToId
      ? await getUsernameFromId(assignedToId)
      : null;
    const oldAssignee = todo.assignedToId
      ? await getUsernameFromId(todo.assignedToId)
      : null;

    await prisma.todoUpdate.create({
      data: {
        todoId: id,
        description: `Assignment changed from ${oldAssignee || "Unassigned"} to ${newAssignee || "Unassigned"}`,
        updateType: "assignment",
        oldValue: oldAssignee || "Unassigned",
        newValue: newAssignee || "Unassigned",
      },
    });
  }

  // Update mentioned employees
  if (updates.mentionedUsernames) {
    // Remove all current mentions
    await prisma.todoMention.deleteMany({ where: { todoId: id } });

    // Add new mentions
    for (const username of updates.mentionedUsernames) {
      const employeeId = await getEmployeeIdFromUsername(username);
      if (
        employeeId &&
        employeeId !== todo.createdById &&
        employeeId !== assignedToId
      ) {
        await prisma.todoMention.create({
          data: {
            todoId: id,
            employeeId,
          },
        });
      }
    }

    await prisma.todoUpdate.create({
      data: {
        todoId: id,
        description: `Mentioned employees updated: ${updates.mentionedUsernames.join(", ")}`,
        updateType: "mention_added",
      },
    });
  }

  return getTodoById(id);
};

export const addTodoUpdate = async (
  todoId: string,
  description: string,
  updateType: string
) => {
  await prisma.todoUpdate.create({
    data: {
      todoId,
      description,
      updateType,
    },
  });

  return getTodoById(todoId);
};

export const getTodoUpdates = async (todoId: string) => {
  return prisma.todoUpdate.findMany({
    where: { todoId },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteTodo = async (todoId: string, requesterId: string) => {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    select: { id: true, createdById: true },
  });

  if (!todo) {
    throw new Error("Todo not found");
  }

  // 🔒 Authorization check
  if (todo.createdById !== requesterId) {
    throw new Error("You are not allowed to delete this todo");
  }

  await prisma.todoUpdate.deleteMany({ where: { todoId } });
  await prisma.todoMention.deleteMany({ where: { todoId } });

  return prisma.todo.delete({
    where: { id: todoId },
  });
};



export const getTodoStats = async (username: string) => {
  const userId = await getEmployeeIdFromUsername(username);
  if (!userId) {
    throw new Error("User not found");
  }

  const [createdCount, assignedCount, mentionedCount, completedCount] =
    await Promise.all([
      prisma.todo.count({
        where: { createdById: userId },
      }),
      prisma.todo.count({
        where: { assignedToId: userId, completed: false },
      }),
      prisma.todo.count({
        where: {
          mentionedEmployees: {
            some: { employeeId: userId },
          },
          completed: false,
        },
      }),
      prisma.todo.count({
        where: {
          OR: [
            { createdById: userId, completed: true },
            { assignedToId: userId, completed: true },
          ],
        },
      }),
    ]);

  return {
    createdCount,
    assignedCount,
    mentionedCount,
    completedCount,
    pendingCount: assignedCount + mentionedCount,
    total: createdCount + assignedCount + mentionedCount,
  };
};

export const getPendingTodosCount = async (username?: string) => {
  // Only get pending for logged-in user if username provided
  if (username) {
    const userId = await getEmployeeIdFromUsername(username);
    if (!userId) {
      throw new Error("User not found");
    }

    return prisma.todo.count({
      where: {
        OR: [
          { assignedToId: userId, completed: false },
          {
            mentionedEmployees: {
              some: { employeeId: userId },
            },
            completed: false,
          },
        ],
      },
    });
  }

  // Global pending count (fallback for backward compatibility)
  return prisma.todo.count({
    where: { completed: false },
  });
};