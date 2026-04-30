import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import { verifyToken }  from '../middlewares/auth';
import { requireRole }  from '../middlewares/roleGuard';

const router = Router();
router.use(verifyToken, requireRole('admin'));

// Analytics
router.get('/analytics', AdminController.getPlatformAnalytics);

// User management
router.get('/users', AdminController.getAllUsers);

// Coach approval flow
router.get('/coaches/pending',       AdminController.getPendingCoaches);
router.put('/coaches/:id/approve',   AdminController.approveCoach);
router.put('/coaches/:id/suspend',   AdminController.suspendCoach);

// Masterclass moderation
router.get('/masterclasses',         AdminController.getAllMasterclassesAdmin);
router.delete('/masterclasses/:id',  AdminController.forceDeleteMasterclass);

// Phase 6F — Review moderation
router.get('/reviews',               AdminController.getAllReviews);
router.delete('/reviews/:id',        AdminController.adminDeleteReview);

// Kick Requests
router.get('/kick-requests',               AdminController.getKickRequests);
router.put('/kick-requests/:id/approve',   AdminController.approveKickRequest);
router.put('/kick-requests/:id/reject',    AdminController.rejectKickRequest);

export default router;
