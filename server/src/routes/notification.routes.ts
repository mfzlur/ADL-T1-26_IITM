import { Router } from 'express';
import * as NotificationController from '../controllers/notification.controller';
import { verifyToken } from '../middlewares/auth';

const router = Router();

router.get('/', verifyToken, NotificationController.getMyNotifications);
router.put('/:id/read', verifyToken, NotificationController.markAsRead);
router.put('/read-all', verifyToken, NotificationController.markAllAsRead);

export default router;
