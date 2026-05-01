import { AppDataSource } from '../config/database';
import { Masterclass, ClassCategory } from '../entities/Masterclass';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { User, UserRole } from '../entities/User';
import { notifyEnrolledStudents } from './material.service';
import { FavoriteCoach } from '../entities/FavoriteCoach';
import { KickRequest } from '../entities/KickRequest';
import * as NotificationService from './notification.service';
import { NotificationType } from '../entities/Notification';
import { CacheService } from './cache.service';
import crypto from 'crypto';

const masterclassRepo = AppDataSource.getRepository(Masterclass);
const enrollmentRepo  = AppDataSource.getRepository(Enrollment);
const userRepo        = AppDataSource.getRepository(User);

// ─── CREATE ──────────────────────────────────────────────────────────
export const createMasterclass = async (
    coachId: string,
    data: {
        title: string;
        description: string;
        session_date: string;
        category: ClassCategory;
        capacity: number;
        media_url?: string;
        video_url?: string;
    }
) => {
    const coach = await userRepo.findOne({ where: { id: coachId } });
    if (!coach || coach.role !== UserRole.COACH) {
        throw new Error('Only approved coaches can create masterclasses');
    }

    const masterclass = masterclassRepo.create({
        ...data,
        session_date: new Date(data.session_date),
                                               coach_id: coachId,
                                               coach,
    });

    const savedClass = await masterclassRepo.save(masterclass);

    // Notify players who favorited this coach
    const favoriteRepo = AppDataSource.getRepository(FavoriteCoach);
    const favorites = await favoriteRepo.find({ where: { coach_id: coachId } });

    if (favorites.length > 0) {
        const notifications = favorites.map(fav => ({
            user_id: fav.player_id,
            type: NotificationType.NEW_CLASS_FROM_FAVORITE,
            title: 'New Class from Your Favorite Coach!',
            message: `${coach.name} just published a new masterclass: "${savedClass.title}".`
        }));

        // Save all notifications concurrently
        await Promise.all(notifications.map(n => NotificationService.createNotification(n)));
    }

    // Invalidate list cache
    await CacheService.delByPattern('mc:list:*');

    return savedClass;
};

// ─── GET ALL with full filters + pagination ───────────────────────────
export const getAllMasterclasses = async (filters: {
    category?:    ClassCategory;
    search?:      string;
    coachName?:   string;
    available?:   boolean;
    dateFrom?:    string;
    dateTo?:      string;
    sortBy?:      'date' | 'created';
    sortOrder?:   'ASC' | 'DESC';
    page?:        number;
    limit?:       number;
}) => {
    // Generate cache key based on filters
    const filterHash = crypto
        .createHash('md5')
        .update(JSON.stringify(filters))
        .digest('hex');
    const cacheKey = `mc:list:${filterHash}`;

    // Try cache first
    const cachedData = await CacheService.get<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    }>(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    const page      = filters.page  || 1;
    const limit     = filters.limit || 9;
    const skip      = (page - 1) * limit;

    const qb = masterclassRepo
    .createQueryBuilder('mc')
    .leftJoinAndSelect('mc.coach', 'coach')
    .where('coach.is_approved = :approved', { approved: true });

    // Keyword search across title + description
    if (filters.search) {
        qb.andWhere(
            '(mc.title ILIKE :search OR mc.description ILIKE :search)',
                    { search: `%${filters.search}%` }
        );
    }

    // Coach name filter
    if (filters.coachName) {
        qb.andWhere('coach.name ILIKE :coachName', { coachName: `%${filters.coachName}%` });
    }

    // Category filter
    if (filters.category) {
        qb.andWhere('mc.category = :category', { category: filters.category });
    }

    // Date range filter
    if (filters.dateFrom) {
        qb.andWhere('mc.session_date >= :dateFrom', {
            dateFrom: new Date(filters.dateFrom)
        });
    }
    if (filters.dateTo) {
        qb.andWhere('mc.session_date <= :dateTo', {
            dateTo: new Date(filters.dateTo)
        });
    }

    // Available-only filter: exclude full classes and past sessions at SQL level
    // so pagination and counts are correct
    if (filters.available) {
        qb.andWhere('mc.session_date > :now', { now: new Date() });
        // Exclude classes where active enrollment count >= capacity
        qb.andWhere(
            `mc.capacity > (
                SELECT COUNT(*) FROM enrollments e
                WHERE e.masterclass_id = mc.id AND e.status = :activeStatus
            )`,
            { activeStatus: EnrollmentStatus.ACTIVE }
        );
    }

    // Sort
    const order = filters.sortOrder || 'ASC';
    if (filters.sortBy === 'date') {
        qb.orderBy('mc.session_date', order);
    } else {
        qb.orderBy('mc.created_at', 'DESC');
    }

    // Get total count AFTER all filters (for correct page controls)
    const total = await qb.getCount();

    // Apply pagination
    qb.skip(skip).take(limit);

    const classes = await qb.getMany();

    // Attach enrollment counts
    const result = await Promise.all(
        classes.map(async (mc) => {
            const enrolledCount = await enrollmentRepo.count({
                where: { masterclass_id: mc.id, status: EnrollmentStatus.ACTIVE },
            });
            return {
                ...mc,
                enrolled_count:  enrolledCount,
                seats_remaining: mc.capacity - enrolledCount,
            };
        })
    );

    const resultResponse = {
        data:        result,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
    };

    // Cache the result for 5 minutes
    await CacheService.set(cacheKey, resultResponse, 300);

    return resultResponse;
};

// ─── GET ONE ─────────────────────────────────────────────────────────
export const getMasterclassById = async (id: string) => {
    const mc = await masterclassRepo.findOne({
        where: { id },
        relations: ['coach', 'materials'],
        order: { materials: { sort_order: 'ASC' } },
    });

    if (!mc) throw new Error('Masterclass not found');

    const enrolledCount = await enrollmentRepo.count({
        where: { masterclass_id: id, status: EnrollmentStatus.ACTIVE },
    });

    return {
        ...mc,
        enrolled_count: enrolledCount,
        seats_remaining: mc.capacity - enrolledCount,
    };
};

// ─── GET MINE (coach's own classes) ──────────────────────────────────
export const getMyMasterclasses = async (coachId: string) => {
    const classes = await masterclassRepo.find({
        where: { coach_id: coachId },
        order: { created_at: 'DESC' },
    });

    return await Promise.all(
        classes.map(async (mc) => {
            const enrolledCount = await enrollmentRepo.count({
                where: { masterclass_id: mc.id, status: EnrollmentStatus.ACTIVE },
            });
            const waitlistCount = await enrollmentRepo.count({
                where: { masterclass_id: mc.id, status: EnrollmentStatus.WAITLISTED },
            });
            return {
                ...mc,
                enrolled_count: enrolledCount,
                waitlist_count: waitlistCount,
                seats_remaining: mc.capacity - enrolledCount,
            };
        })
    );
};

// ─── UPDATE ───────────────────────────────────────────────────────────
export const updateMasterclass = async (
    id: string,
    coachId: string,
    data: Partial<{
        title: string;
        description: string;
        session_date: string;
        category: ClassCategory;
        capacity: number;
        media_url: string;
        video_url: string;
    }>
) => {
    const mc = await masterclassRepo.findOne({ where: { id } });
    if (!mc) throw new Error('Masterclass not found');

    // Ownership check
    if (mc.coach_id !== coachId) {
        throw new Error('You can only edit your own masterclasses');
    }

    // If reducing capacity, make sure it doesn't go below active enrollments
    if (data.capacity !== undefined) {
        const enrolledCount = await enrollmentRepo.count({
            where: { masterclass_id: id, status: EnrollmentStatus.ACTIVE },
        });
        if (data.capacity < enrolledCount) {
            throw new Error(
                `Capacity cannot be less than current enrollments (${enrolledCount})`
            );
        }
    }

    const updated = masterclassRepo.merge(mc, {
        ...data,
        session_date: data.session_date ? new Date(data.session_date) : mc.session_date,
    });

    const saved = await masterclassRepo.save(updated);

    // Build a summary of what changed
    const changes: string[] = [];
    if (data.title && data.title !== mc.title) changes.push('title');
    if (data.description && data.description !== mc.description) changes.push('description');
    if (data.session_date) changes.push('schedule');
    if (data.video_url !== undefined) changes.push('video');
    if (data.capacity !== undefined && data.capacity !== mc.capacity) changes.push('capacity');

    if (changes.length > 0) {
        await notifyEnrolledStudents(
            id,
            saved.title,
            `Class details updated: ${changes.join(', ')} changed.`
        );
    }

    // Invalidate list cache
    await CacheService.delByPattern('mc:list:*');

    return saved;
};

// ─── DELETE ───────────────────────────────────────────────────────────
export const deleteMasterclass = async (id: string, coachId: string) => {
    const mc = await masterclassRepo.findOne({ where: { id } });
    if (!mc) throw new Error('Masterclass not found');

    // Ownership check
    if (mc.coach_id !== coachId) {
        throw new Error('You can only delete your own masterclasses');
    }

    // Block delete if active enrollments exist
    const activeEnrollments = await enrollmentRepo.count({
        where: { masterclass_id: id, status: EnrollmentStatus.ACTIVE },
    });

    if (activeEnrollments > 0) {
        throw new Error(
            `Cannot delete — ${activeEnrollments} active enrollment(s) exist. Contact admin for override.`
        );
    }

    await masterclassRepo.remove(mc);
    
    // Invalidate list cache
    await CacheService.delByPattern('mc:list:*');

    return { message: 'Masterclass deleted successfully' };
};

export const requestKick = async (
    masterclassId: string,
    playerId: string,
    coachId: string,
    reason: string
) => {
    const mc = await masterclassRepo.findOne({ where: { id: masterclassId } });
    if (!mc) throw new Error('Masterclass not found');
    if (mc.coach_id !== coachId) throw new Error('You can only request to kick from your own masterclasses');

    const enrollment = await enrollmentRepo.findOne({
        where: { masterclass_id: masterclassId, player_id: playerId }
    });
    if (!enrollment) throw new Error('Student is not enrolled in this masterclass');

    const kickRepo = AppDataSource.getRepository(KickRequest);
    const existingReq = await kickRepo.findOne({
        where: { masterclass_id: masterclassId, player_id: playerId, coach_id: coachId, status: 'pending' as any }
    });
    if (existingReq) throw new Error('A pending kick request already exists for this student');

    const req = kickRepo.create({
        masterclass_id: masterclassId,
        player_id: playerId,
        coach_id: coachId,
        reason
    });
    await kickRepo.save(req);

    try {
    await NotificationService.createNotification({
        user_id: playerId,
        type: NotificationType.KICK_REQUEST_PENDING,
        title: 'Removal Request Filed Against You',
        message: `Your coach has filed a removal request for "${mc.title}". Reason: "${reason}". This is pending admin review.`
    });
} catch (notifErr) {
    console.error('[requestKick] Failed to notify student:', notifErr);
}



    return { message: 'Kick request submitted for admin review' };
};
