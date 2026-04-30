import { Router } from 'express';
import * as MasterclassController from '../controllers/masterclass.controller';
import { verifyToken }  from '../middlewares/auth';
import { requireRole }  from '../middlewares/roleGuard';
import { upload }       from '../middlewares/upload';
import { validate }     from '../middlewares/validate';
import {
  createMasterclassSchema,
  updateMasterclassSchema,
} from '../validators/masterclass.validator';

const router = Router();

// ── Public routes ────────────────────────────────────────────────────
router.get('/', MasterclassController.getAllMasterclasses);

// ── Coach-only routes ────────────────────────────────────────────────
// ⚠️ /mine MUST come before /:id
router.get(
  '/mine',
  verifyToken,
  requireRole('coach'),
  MasterclassController.getMyMasterclasses
);

router.post(
  '/',
  verifyToken,
  requireRole('coach'),
  upload.single('media'),           // 1. parse multipart first
  validate(createMasterclassSchema), // 2. then validate parsed body
  MasterclassController.createMasterclass
);

router.put(
  '/:id',
  verifyToken,
  requireRole('coach'),
  upload.single('media'),           // 1. parse multipart first
  validate(updateMasterclassSchema), // 2. then validate parsed body
  MasterclassController.updateMasterclass
);

router.delete(
  '/:id',
  verifyToken,
  requireRole('coach'),
  MasterclassController.deleteMasterclass
);

router.get(
  '/:id/enrollments',
  verifyToken,
  requireRole('coach'),
  MasterclassController.getEnrollments
);

router.post(
  '/:id/kick/:player_id',
  verifyToken,
  requireRole('coach'),
  MasterclassController.requestKick
);

// ── Public single class (MUST be last) ──────────────────────────────
router.get('/:id', MasterclassController.getMasterclassById);

export default router;
