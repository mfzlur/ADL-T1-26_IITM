import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as ProfileService from '../services/profile.service';

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.updateProfile(req.user!.userId, req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.getMyProfile(req.user!.userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getStudentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.getStudentProfile(req.params.id as string, req.user!.userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(403).json({ message: err.message });
  }
};

export const getPublicCoachProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.getPublicCoachProfile(req.params.id as string);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const getAllCoaches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const playerId = req.user?.role === 'player' ? req.user.userId : undefined;
    const result = await ProfileService.getAllCoaches(playerId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const toggleFavoriteCoach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.toggleFavoriteCoach(req.user!.userId, req.params.id as string);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getFavoriteCoaches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ProfileService.getFavoriteCoaches(req.user!.userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};