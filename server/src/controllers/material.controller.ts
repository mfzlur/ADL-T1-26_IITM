import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as MaterialService from '../services/material.service';

// ADDED: typed param interfaces — eliminates noUncheckedIndexedAccess widening
interface ClassIdParam { classId: string }
interface MaterialIdParam { id: string }

// CHANGED: AuthRequest & Request<ClassIdParam> to type req.params.classId as string
export const addMaterial = async (
  req: AuthRequest & Request<ClassIdParam>,
  res: Response
): Promise<void> => {
  try {
    const result = await MaterialService.addMaterial(
      req.user!.userId,
      req.params.classId,  // no cast needed
      req.body
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// CHANGED: Request<ClassIdParam> to type req.params.classId as string
export const getMaterials = async (
  req: Request<ClassIdParam>,
  res: Response
): Promise<void> => {
  try {
    const result = await MaterialService.getMaterials(req.params.classId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

// CHANGED: AuthRequest & Request<MaterialIdParam> to type req.params.id as string
export const updateMaterial = async (
  req: AuthRequest & Request<MaterialIdParam>,
  res: Response
): Promise<void> => {
  try {
    const result = await MaterialService.updateMaterial(
      req.user!.userId,
      Number(req.params.id),  // Number() on a string is safe, no cast needed
      req.body
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// CHANGED: AuthRequest & Request<MaterialIdParam> to type req.params.id as string
export const deleteMaterial = async (
  req: AuthRequest & Request<MaterialIdParam>,
  res: Response
): Promise<void> => {
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

// CHANGED: AuthRequest & Request<ClassIdParam> to type req.params.classId as string
export const reorderMaterials = async (
  req: AuthRequest & Request<ClassIdParam>,
  res: Response
): Promise<void> => {
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
