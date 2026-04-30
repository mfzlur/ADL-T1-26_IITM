import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as ReviewService from '../services/review.service';
import { CreateReviewBody } from '../schemas/review.schemas';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body as CreateReviewBody;
    const result = await ReviewService.createReview(
      req.user!.userId,
      req.params.masterclassId as string,
      rating,       // already a number, already 1–5
      comment,
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getReviewsByClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ReviewService.getReviewsByClass(req.params.masterclassId as string);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const result = await ReviewService.updateReview(
      req.user!.userId,
      req.params.masterclassId as string,
      { rating, comment }
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ReviewService.deleteReview(
      req.user!.userId,
      req.params.masterclassId as string,
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
