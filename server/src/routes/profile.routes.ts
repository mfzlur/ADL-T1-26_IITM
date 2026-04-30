import { Router } from 'express';
import * as ProfileController from '../controllers/profile.controller';
import { verifyToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';

const router = Router();

router.get('/me', verifyToken, ProfileController.getMyProfile);
router.patch('/me', verifyToken, ProfileController.updateMyProfile);
router.get('/students/:id', verifyToken, requireRole('coach'), ProfileController.getStudentProfile);
router.get('/coach/:id', ProfileController.getPublicCoachProfile);
router.get('/coaches', verifyToken, ProfileController.getAllCoaches);
router.get('/me/favorite-coaches', verifyToken, requireRole('player'), ProfileController.getFavoriteCoaches);
router.post('/coaches/:id/favorite', verifyToken, requireRole('player'), ProfileController.toggleFavoriteCoach);

export default router;