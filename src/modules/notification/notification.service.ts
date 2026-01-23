import prisma from "../../config/postgres";

export enum NotificationType {
  PURCHASE_ORDER_APPROVED = "PURCHASE_ORDER_APPROVED",
}

export class NotificationService {
  async createNotification(userId: string, type: NotificationType, message: string) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          message,
        },
      });
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async getNotificationsForUser(userId: string) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }
}