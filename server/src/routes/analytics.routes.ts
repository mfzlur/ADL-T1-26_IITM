import { Router } from 'express';
import { getCoachAnalytics } from '../controllers/analytics.controller';
import { verifyToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';

const router = Router();

router.get(
    '/coach',
    verifyToken,
    requireRole('coach'),
           getCoachAnalytics
);

export default router;
