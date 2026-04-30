import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as AdminService from '../services/admin.service';
import { UserRole } from '../entities/User';

export const getPlatformAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getPlatformAnalytics()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const getPendingCoaches = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getPendingCoaches()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const approveCoach = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.approveCoach(req.params.id as string)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const suspendCoach = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.suspendCoach(req.params.id as string)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const getAllMasterclassesAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getAllMasterclassesAdmin()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const forceDeleteMasterclass = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.forceDeleteMasterclass(req.params.id as string)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.query.role as UserRole | undefined;
    res.status(200).json(await AdminService.getAllUsers(role));
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// Phase 6E ─────────────────────────────────────────────────────────────
export const getAllReviews = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getAllReviews()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const adminDeleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.adminDeleteReview(Number(req.params.id))); }
  catch (err: any) { res.status(404).json({ message: err.message }); }
};

export const getKickRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await AdminService.getKickRequests();
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const approveKickRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await AdminService.approveKickRequest(req.params.id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const rejectKickRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await AdminService.rejectKickRequest(req.params.id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
