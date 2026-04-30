import { Router } from 'express';
import * as EnrollmentController from '../controllers/enrollment.controller';
import { verifyToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';

const router = Router();

// Player routes
router.get(
    '/my',
    verifyToken,
    requireRole('player'),
           EnrollmentController.getMyEnrollments
);

router.post(
    '/:masterclassId',
    verifyToken,
    requireRole('player'),
            EnrollmentController.enroll
);

router.delete(
    '/:masterclassId',
    verifyToken,
    requireRole('player'),
              EnrollmentController.cancelEnrollment
);

// Coach route — view students of their class
router.get(
    '/:masterclassId/students',
    verifyToken,
    requireRole('coach'),
           EnrollmentController.getClassStudents
);

export default router;
