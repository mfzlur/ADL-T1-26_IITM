import { Router } from 'express';
import * as ReviewController from '../controllers/review.controller';
import { verifyToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { UserRole } from '../entities/User';
import { validate } from '../middlewares/validate';
import { CreateReviewSchema } from '../schemas/review.schemas';

const router = Router();

router.get(
  '/:masterclassId',
  ReviewController.getReviewsByClass,
);

router.post(
  '/:masterclassId',
  verifyToken,
  requireRole(UserRole.PLAYER),
  validate(CreateReviewSchema),
  ReviewController.createReview,
);

router.patch(
  '/:masterclassId',
  verifyToken,
  requireRole(UserRole.PLAYER),
  ReviewController.updateReview,
);

router.delete(
  '/:masterclassId',
  verifyToken,
  requireRole(UserRole.PLAYER),
  ReviewController.deleteReview,
);

export default router;
