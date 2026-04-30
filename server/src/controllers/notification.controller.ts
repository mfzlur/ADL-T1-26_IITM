import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as NotificationService from '../services/notification.service';

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.user!.userId);
    const unread = await NotificationService.getUnreadCount(req.user!.userId);
    res.json({ notifications, unread_count: unread });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await NotificationService.markAsRead(id, req.user!.userId);
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await NotificationService.markAllAsRead(req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
