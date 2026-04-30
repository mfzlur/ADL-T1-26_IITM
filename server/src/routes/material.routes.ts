import { Router } from 'express';
import * as MaterialController from '../controllers/material.controller';
import { verifyToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';

const router = Router();

// Public — get materials for a class
router.get('/:classId', MaterialController.getMaterials);

// Coach-only — manage materials
router.post(
  '/:classId',
  verifyToken,
  requireRole('coach'),
  MaterialController.addMaterial
);

router.put(
  '/item/:id',
  verifyToken,
  requireRole('coach'),
  MaterialController.updateMaterial
);

router.delete(
  '/item/:id',
  verifyToken,
  requireRole('coach'),
  MaterialController.deleteMaterial
);

router.put(
  '/:classId/reorder',
  verifyToken,
  requireRole('coach'),
  MaterialController.reorderMaterials
);

export default router;
