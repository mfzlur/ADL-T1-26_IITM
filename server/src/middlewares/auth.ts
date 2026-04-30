import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
    userId: string;
    role: string;
    email: string;
}

// Extend Express Request to carry the decoded token
export interface AuthRequest extends Request {
    user?: AuthPayload;
}

export const verifyToken = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1] as string;

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as unknown as AuthPayload;

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
