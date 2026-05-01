import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Masterclass } from '../entities/Masterclass';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { Review } from '../entities/Review';
import { KickRequest, KickRequestStatus } from '../entities/KickRequest';
import * as NotificationService from './notification.service';
import { NotificationType } from '../entities/Notification';
import { CacheService } from './cache.service';

const userRepo        = AppDataSource.getRepository(User);
const masterclassRepo = AppDataSource.getRepository(Masterclass);
const enrollmentRepo  = AppDataSource.getRepository(Enrollment);
const reviewRepo      = AppDataSource.getRepository(Review);

// ─── PLATFORM ANALYTICS ──────────────────────────────────────────────
export const getPlatformAnalytics = async () => {
  const [
    totalUsers, totalCoaches, totalPlayers, totalAdmins,
    totalMasterclasses, totalEnrollments,
    activeEnrollments, waitlistedEnrollments, pendingCoaches,
  ] = await Promise.all([
    userRepo.count(),
    userRepo.count({ where: { role: UserRole.COACH } }),
    userRepo.count({ where: { role: UserRole.PLAYER } }),
    userRepo.count({ where: { role: UserRole.ADMIN } }),
    masterclassRepo.count(),
    enrollmentRepo.count(),
    enrollmentRepo.count({ where: { status: EnrollmentStatus.ACTIVE } }),
    enrollmentRepo.count({ where: { status: EnrollmentStatus.WAITLISTED } }),
    userRepo.count({ where: { role: UserRole.COACH, is_approved: false } }),
  ]);

  const topClasses = await masterclassRepo
    .createQueryBuilder('mc')
    .leftJoin('mc.enrollments', 'e')
    .leftJoin('mc.coach', 'coach')
    .select(['mc.id', 'mc.title', 'mc.category', 'mc.capacity', 'coach.name'])
    .addSelect('COUNT(e.id)', 'enrollment_count')
    .where('e.status = :status', { status: EnrollmentStatus.ACTIVE })
    .groupBy('mc.id')
    .addGroupBy('mc.title').addGroupBy('mc.category')
    .addGroupBy('mc.capacity').addGroupBy('coach.name')
    .orderBy('enrollment_count', 'DESC')
    .limit(5)
    .getRawMany();

  const recentEnrollments = await enrollmentRepo.find({
    relations: ['player', 'masterclass'],
    order:     { enrolled_at: 'DESC' },
    take:      5,
  });

  return {
    users: {
      total: totalUsers, coaches: totalCoaches,
      players: totalPlayers, admins: totalAdmins,
      pending_coaches: pendingCoaches,
    },
    masterclasses: { total: totalMasterclasses },
    enrollments: {
      total: totalEnrollments,
      active: activeEnrollments,
      waitlisted: waitlistedEnrollments,
    },
    top_classes:     topClasses,
    recent_activity: recentEnrollments,
  };
};

// ─── PENDING COACHES ─────────────────────────────────────────────────
export const getPendingCoaches = async () => {
  return await userRepo.find({
    where:  { role: UserRole.COACH, is_approved: false },
    select: ['id', 'name', 'email', 'created_at'],
    order:  { created_at: 'ASC' },
  });
};

// ─── APPROVE COACH ────────────────────────────────────────────────────
export const approveCoach = async (coachId: string) => {
  const coach = await userRepo.findOne({ where: { id: coachId, role: UserRole.COACH } });
  if (!coach) throw new Error('Coach not found');
  if (coach.is_approved) throw new Error('Coach is already approved');
  coach.is_approved = true;
  await userRepo.save(coach);
  
  // Invalidate user permission cache
  await CacheService.del(`user:perm:${coachId}`);
  
  return { message: `Coach "${coach.name}" has been approved successfully` };
};

// ─── SUSPEND COACH ────────────────────────────────────────────────────
export const suspendCoach = async (coachId: string) => {
  const coach = await userRepo.findOne({ where: { id: coachId, role: UserRole.COACH } });
  if (!coach) throw new Error('Coach not found');
  if (!coach.is_approved) throw new Error('Coach is already suspended/pending');
  coach.is_approved = false;
  await userRepo.save(coach);

  // Invalidate user permission cache
  await CacheService.del(`user:perm:${coachId}`);

  return { message: `Coach "${coach.name}" has been suspended` };
};

// ─── GET ALL MASTERCLASSES — admin view (Phase 8A) ────────────────────
// Fix: replaces the N+1 loop (one COUNT query per class) with a single
// QueryBuilder that aggregates enrolled counts in one DB round-trip.
// Adds pagination so this endpoint doesn't time-out at scale.
export const getAllMasterclassesAdmin = async (page = 1, limit = 15) => {
  const skip = (page - 1) * limit;

  // Single query: classes + enrolled count via LEFT JOIN aggregate
  const [rawClasses, total] = await Promise.all([
    masterclassRepo
      .createQueryBuilder('mc')
      .leftJoinAndSelect('mc.coach', 'coach')
      .leftJoin(
        (qb) =>
          qb
            .select('e.masterclass_id', 'masterclass_id')
            .addSelect('COUNT(e.id)', 'enrolled_count')
            .from(Enrollment, 'e')
            .where('e.status = :s', { s: EnrollmentStatus.ACTIVE })
            .groupBy('e.masterclass_id'),
        'counts',
        'counts.masterclass_id = mc.id'
      )
      .addSelect('COALESCE(counts.enrolled_count, 0)', 'enrolled_count')
      .orderBy('mc.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawAndEntities(),
    masterclassRepo.count(),
  ]);

  // Merge the aggregate count into each entity
  const data = rawClasses.entities.map((mc, i) => ({
    ...mc,
    enrolled_count:  Number(rawClasses.raw[i]?.enrolled_count ?? 0),
    seats_remaining: mc.capacity - Number(rawClasses.raw[i]?.enrolled_count ?? 0),
  }));

  return {
    data,
    total,
    page,
    total_pages: Math.ceil(total / limit),
  };
};

// ─── FORCE DELETE MASTERCLASS ─────────────────────────────────────────
export const forceDeleteMasterclass = async (masterclassId: string) => {
  const mc = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!mc) throw new Error('Masterclass not found');
  await masterclassRepo.remove(mc);

  // Invalidate list cache
  await CacheService.delByPattern('mc:list:*');

  return { message: `Masterclass "${mc.title}" has been removed by admin` };
};

// ─── GET ALL USERS (Phase 8A) ─────────────────────────────────────────
// Adds pagination. Role filter preserved. Returns envelope with total
// and total_pages so the frontend can render a paginator.
export const getAllUsers = async (
  role?: UserRole,
  page  = 1,
  limit = 20
) => {
  const skip  = (page - 1) * limit;
  const where = role ? { role } : {};

  const [data, total] = await userRepo.findAndCount({
    where,
    select: ['id', 'name', 'email', 'role', 'is_approved', 'created_at'],
    order:  { created_at: 'DESC' },
    skip,
    take:   limit,
  });

  return {
    data,
    total,
    page,
    total_pages: Math.ceil(total / limit),
  };
};

// ─── GET ALL REVIEWS — admin moderation ───────────────────────────────
export const getAllReviews = async () => {
  const reviews = await reviewRepo.find({
    relations: ['player', 'masterclass', 'masterclass.coach'],
    order:     { created_at: 'DESC' },
  });

  return reviews.map(r => ({
    id:                r.id,
    rating:            r.rating,
    comment:           r.comment,
    created_at:        r.created_at,
    player_id:         r.player_id,
    player_name:       r.player?.name,
    masterclass_id:    r.masterclass_id,
    masterclass_title: r.masterclass?.title,
    coach_name:        r.masterclass?.coach?.name,
  }));
};

// ─── ADMIN DELETE REVIEW ──────────────────────────────────────────────
export const adminDeleteReview = async (reviewId: number) => {
  const review = await reviewRepo.findOne({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');
  await reviewRepo.remove(review);
  return { message: 'Review removed by admin' };
};

// ─── GET KICK REQUESTS ───────────────────────────────────────────────
export const getKickRequests = async () => {
  const kickRepo = AppDataSource.getRepository(KickRequest);
  return await kickRepo.find({
    relations: ['coach', 'player', 'masterclass'],
    order: { created_at: 'DESC' }
  });
};

// ─── APPROVE KICK REQUEST ─────────────────────────────────────────────
export const approveKickRequest = async (requestId: string) => {
  const kickRepo = AppDataSource.getRepository(KickRequest);
  const req = await kickRepo.findOne({
    where: { id: requestId },
    relations: ['coach', 'player', 'masterclass']
  });
  if (!req) throw new Error('Request not found');
  if (req.status !== KickRequestStatus.PENDING) throw new Error('Request already resolved');

  req.status = KickRequestStatus.APPROVED;
  await kickRepo.save(req);

  // Cancel enrollment
  const enrollment = await enrollmentRepo.findOne({
    where: { masterclass_id: req.masterclass_id, player_id: req.player_id }
  });
  if (enrollment) {
    await enrollmentRepo.remove(enrollment);
  }

  // Notify coach
  await NotificationService.createNotification({
    user_id: req.coach_id,
    type: NotificationType.KICK_REQUEST_APPROVED,
    title: 'Kick Request Approved',
    message: `Admin approved your request to remove ${req.player?.name} from "${req.masterclass?.title}".`
  })

  // Notify student
  await NotificationService.createNotification({
  user_id: req.player_id,
  type: NotificationType.KICKED_FROM_CLASS,
  title: 'Removed from Class',
  message: `You have been removed from "${req.masterclass?.title}". Reason: ${req.reason}`
});

  return { message: 'Kick request approved' };
};

// ─── REJECT KICK REQUEST ─────────────────────────────────────────────
export const rejectKickRequest = async (requestId: string) => {
  const kickRepo = AppDataSource.getRepository(KickRequest);
  const req = await kickRepo.findOne({
    where: { id: requestId },
    relations: ['coach', 'player', 'masterclass']
  });
  if (!req) throw new Error('Request not found');
  if (req.status !== KickRequestStatus.PENDING) throw new Error('Request already resolved');

  req.status = KickRequestStatus.REJECTED;
  await kickRepo.save(req);

  // Notify coach
  await NotificationService.createNotification({
    user_id: req.coach_id,
    type: NotificationType.KICK_REQUEST_REJECTED,
    title: 'Kick Request Rejected',
    message: `Admin rejected your request to kick ${req.player?.name} from ${req.masterclass?.title}`
  });

  return { message: 'Kick request rejected' };
};
