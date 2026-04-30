import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as MasterclassService from '../services/masterclass.service';
import * as EnrollmentService from '../services/enrollment.service';
import { ClassCategory } from '../entities/Masterclass';

// No direct DB access in this file — all logic lives in the service layer

export const createMasterclass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Zod validator (wired in routes) guarantees all fields are present + valid
    const { title, description, session_date, category, capacity, video_url } = req.body;
    const media_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const masterclass = await MasterclassService.createMasterclass(
      req.user!.userId,
      { title, description, session_date, category, capacity: Number(capacity), media_url, video_url: video_url || undefined }
    );

    res.status(201).json(masterclass);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};


// Replace the existing getAllMasterclasses handler with this:
export const getAllMasterclasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category, search, coachName,       // Phase 9C: coachName added
      available, dateFrom, dateTo,
      sortBy, sortOrder,
      page, limit,
    } = req.query;

    const result = await MasterclassService.getAllMasterclasses({
      category:   category  as ClassCategory | undefined,
      search:     search    as string | undefined,
      coachName:  coachName as string | undefined,   // Phase 9C
      available:  available === 'true',
      dateFrom:   dateFrom  as string | undefined,
      dateTo:     dateTo    as string | undefined,
      sortBy:     sortBy    as 'date' | 'created' | undefined,
      sortOrder:  sortOrder as 'ASC' | 'DESC' | undefined,
      page:       page  ? Number(page)  : undefined,
      limit:      limit ? Number(limit) : undefined,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMasterclassById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await MasterclassService.getMasterclassById(
      req.params.id as string
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const getMyMasterclasses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await MasterclassService.getMyMasterclasses(req.user!.userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMasterclass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const media_url = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.media_url;
    const video_url = req.body.video_url;

    const result = await MasterclassService.updateMasterclass(
      req.params.id as string,
      req.user!.userId,
      { ...req.body, media_url, video_url }
    );

    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteMasterclass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await MasterclassService.deleteMasterclass(
      req.params.id as string,
      req.user!.userId
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// 5C ── Delegates to service — no inline DB logic ─────────────────────
export const getEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await EnrollmentService.getClassStudents(
      req.params.id as string,
      req.user!.userId
    );
    res.status(200).json(result);
  } catch (err: any) {
    // Ownership violations return 403, not-found returns 404
    const status = err.message.includes('own') ? 403 : 404;
    res.status(status).json({ message: err.message });
  }
};

export const requestKick = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ message: 'Reason is required' });
      return;
    }
    const result = await MasterclassService.requestKick(
      req.params.id as string,
      req.params.player_id as string,
      req.user!.userId,
      reason
    );
    res.status(200).json(result);
  } catch (err: any) {
    const status = err.message.includes('own') ? 403 : 404;
    res.status(status).json({ message: err.message });
  }
};
