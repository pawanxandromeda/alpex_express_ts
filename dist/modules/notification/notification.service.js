"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = exports.NotificationType = void 0;
const postgres_1 = __importDefault(require("../../config/postgres"));
var NotificationType;
(function (NotificationType) {
    NotificationType["PURCHASE_ORDER_APPROVED"] = "PURCHASE_ORDER_APPROVED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class NotificationService {
    async createNotification(userId, type, message) {
        try {
            const notification = await postgres_1.default.notification.create({
                data: {
                    userId,
                    type,
                    message,
                },
            });
            return notification;
        }
        catch (error) {
            console.error("Error creating notification:", error);
            throw error;
        }
    }
    async getNotificationsForUser(userId) {
        try {
            const notifications = await postgres_1.default.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
            });
            return notifications;
        }
        catch (error) {
            console.error("Error fetching notifications:", error);
            throw error;
        }
    }
    async markNotificationAsRead(notificationId) {
        try {
            const notification = await postgres_1.default.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
            });
            return notification;
        }
        catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    }
}
exports.NotificationService = NotificationService;
