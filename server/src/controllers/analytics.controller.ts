import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as AnalyticsService from '../services/analytics.service';

export const getCoachAnalytics = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const data = await AnalyticsService.getCoachAnalytics(req.user!.userId);
        res.status(200).json(data);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
