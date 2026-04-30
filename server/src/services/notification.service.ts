import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../entities/Notification';

const notifRepo = AppDataSource.getRepository(Notification);

// ─── CREATE ──────────────────────────────────────────────────────────
export const createNotification = async (data: {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
}) => {
  const notif = notifRepo.create(data);
  return await notifRepo.save(notif);
};

// ─── GET USER NOTIFICATIONS ─────────────────────────────────────────
export const getUserNotifications = async (userId: string, limit = 20) => {
  return await notifRepo.find({
    where: { user_id: userId },
    order: { created_at: 'DESC' },
    take: limit,
  });
};

// ─── UNREAD COUNT ────────────────────────────────────────────────────
export const getUnreadCount = async (userId: string) => {
  return await notifRepo.count({
    where: { user_id: userId, is_read: false },
  });
};

// ─── MARK AS READ ────────────────────────────────────────────────────
export const markAsRead = async (notifId: number, userId: string) => {
  const notif = await notifRepo.findOne({
    where: { id: notifId, user_id: userId },
  });
  if (!notif) throw new Error('Notification not found');
  notif.is_read = true;
  return await notifRepo.save(notif);
};

// ─── MARK ALL AS READ ────────────────────────────────────────────────
export const markAllAsRead = async (userId: string) => {
  await notifRepo.update(
    { user_id: userId, is_read: false },
    { is_read: true }
  );
  return { message: 'All notifications marked as read' };
};
