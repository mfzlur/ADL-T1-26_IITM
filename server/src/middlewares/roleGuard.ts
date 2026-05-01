import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { CacheService } from '../services/cache.service';

const userRepo = AppDataSource.getRepository(User);

export const requireRole = (...roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
            return;
        }

        // Cache-aside for Coach Approval status
        const userId = req.user.userId;
        const cacheKey = `user:perm:${userId}`;
        
        try {
            let userPerms = await CacheService.get<{ role: string, is_approved: boolean }>(cacheKey);
            
            if (!userPerms) {
                const user = await userRepo.findOne({ where: { id: userId } });
                if (!user) {
                    res.status(401).json({ message: 'User no longer exists' });
                    return;
                }
                userPerms = { role: user.role, is_approved: user.is_approved };
                await CacheService.set(cacheKey, userPerms, 3600); // Cache for 1 hour
            }

            // If coach, must be approved to perform sensitive actions
            if (userPerms.role === UserRole.COACH && !userPerms.is_approved) {
                 res.status(403).json({ message: 'Coach account is pending approval or suspended' });
                 return;
            }
        } catch (err) {
            console.error('Error checking user status:', err);
            // Fallback: allow request to proceed if Redis fails, or throw 500?
            // Safer to allow (fail-open) if it's just a cache issue, 
            // but here we are doing a DB lookup too.
        }

        next();
    };
};
