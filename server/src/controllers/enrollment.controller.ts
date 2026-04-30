import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as EnrollmentService from '../services/enrollment.service';

export const enroll = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await EnrollmentService.enroll(
            req.user!.userId,
            req.params.masterclassId as string
        );
        res.status(201).json(result);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const cancelEnrollment = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await EnrollmentService.cancelEnrollment(
            req.user!.userId,
            req.params.masterclassId as string
        );
        res.status(200).json(result);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const getMyEnrollments = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await EnrollmentService.getMyEnrollments(req.user!.userId);
        res.status(200).json(result);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const getClassStudents = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await EnrollmentService.getClassStudents(
            req.params.masterclassId as string,
            req.user!.userId
        );
        res.status(200).json(result);
    } catch (err: any) {
        res.status(403).json({ message: err.message });
    }
};
