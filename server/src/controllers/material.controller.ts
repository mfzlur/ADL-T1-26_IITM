import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as MaterialService from '../services/material.service';

export const addMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await MaterialService.addMaterial(
      req.user!.userId,
      req.params.classId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await MaterialService.getMaterials(req.params.classId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const updateMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await MaterialService.updateMaterial(
      req.user!.userId,
      Number(req.params.id),
      req.body
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await MaterialService.deleteMaterial(
      req.user!.userId,
      Number(req.params.id)
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const reorderMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await MaterialService.reorderMaterials(
      req.user!.userId,
      req.params.classId,
      req.body.materialIds
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
