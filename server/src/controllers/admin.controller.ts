import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as AdminService from '../services/admin.service';
import { UserRole } from '../entities/User';

// ─── Typed param interfaces ────────────────────────────────────────────────
interface IdParam  { id: string }
interface RoleQuery { role?: string }

export const getPlatformAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getPlatformAnalytics()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const getPendingCoaches = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getPendingCoaches()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

// CHANGED: typed Request<IdParam> instead of AuthRequest — eliminates index-signature
// widening from noUncheckedIndexedAccess; req.params.id is now definitively string
export const approveCoach = async (req: Request<IdParam>, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.approveCoach(req.params.id)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const suspendCoach = async (req: Request<IdParam>, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.suspendCoach(req.params.id)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const getAllMasterclassesAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getAllMasterclassesAdmin()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const forceDeleteMasterclass = async (req: Request<IdParam>, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.forceDeleteMasterclass(req.params.id)); }
  catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const getAllUsers = async (req: Request<{}, {}, {}, RoleQuery>, res: Response): Promise<void> => {
  try {
    // CHANGED: req.query.role is now string | undefined (not string | string[] | undefined)
    // Cast to UserRole | undefined is now safe
    const role = req.query.role as UserRole | undefined;
    res.status(200).json(await AdminService.getAllUsers(role));
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// Phase 6E ─────────────────────────────────────────────────────────────
export const getAllReviews = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(200).json(await AdminService.getAllReviews()); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const adminDeleteReview = async (req: Request<IdParam>, res: Response): Promise<void> => {
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

// CHANGED: Request<IdParam> so req.params.id is string, not string | undefined
export const approveKickRequest = async (req: Request<IdParam>, res: Response): Promise<void> => {
  try {
    const result = await AdminService.approveKickRequest(req.params.id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const rejectKickRequest = async (req: Request<IdParam>, res: Response): Promise<void> => {
  try {
    const result = await AdminService.rejectKickRequest(req.params.id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
