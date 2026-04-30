import { AppDataSource } from '../config/database';
import { User, UserRole, ExperienceLevel } from '../entities/User';
import { Enrollment, EnrollmentStatus }    from '../entities/Enrollment';
import { Masterclass }                     from '../entities/Masterclass';
import { FavoriteCoach }                   from '../entities/FavoriteCoach';

const userRepo        = AppDataSource.getRepository(User);
const enrollmentRepo  = AppDataSource.getRepository(Enrollment);
const masterclassRepo = AppDataSource.getRepository(Masterclass);

// ─── UPDATE OWN PROFILE ──────────────────────────────────────────────
// Any authenticated user can update bio, chess_rating, experience_level.
// Fields not provided are left unchanged (partial update).
export const updateProfile = async (
  userId: string,
  data: {
    bio?:              string | null;
    chess_rating?:     number | null;
    experience_level?: ExperienceLevel | null;
  }
) => {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (data.bio              !== undefined) user.bio              = data.bio;
  if (data.chess_rating     !== undefined) user.chess_rating     = data.chess_rating;
  if (data.experience_level !== undefined) user.experience_level = data.experience_level;

  await userRepo.save(user);

  return {
    id:               user.id,
    name:             user.name,
    email:            user.email,
    role:             user.role,
    is_approved:      user.is_approved,
    bio:              user.bio,
    chess_rating:     user.chess_rating,
    experience_level: user.experience_level,
    created_at:       user.created_at,
  };
};

// ─── GET OWN PROFILE ─────────────────────────────────────────────────
export const getMyProfile = async (userId: string) => {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  return {
    id:               user.id,
    name:             user.name,
    email:            user.email,
    role:             user.role,
    is_approved:      user.is_approved,
    bio:              user.bio,
    chess_rating:     user.chess_rating,
    experience_level: user.experience_level,
    created_at:       user.created_at,
  };
};

// ─── GET STUDENT PROFILE (coach view) ────────────────────────────────
// Returns the player's profile + shared classes between this coach and player.
// Access control: coach can only view profiles of players enrolled in
// at least one of their masterclasses — prevents arbitrary user lookups.
export const getStudentProfile = async (
  playerId: string,
  coachId:  string
) => {
  const player = await userRepo.findOne({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');
  if (player.role !== UserRole.PLAYER) throw new Error('User is not a player');

  // Verify the coach has a shared class with this player
  const sharedEnrollment = await enrollmentRepo
    .createQueryBuilder('e')
    .innerJoin(Masterclass, 'mc', 'mc.id = e.masterclass_id')
    .where('e.player_id = :playerId', { playerId })
    .andWhere('mc.coach_id = :coachId', { coachId })
    .getOne();

  if (!sharedEnrollment) {
    throw new Error('This player is not enrolled in any of your classes');
  }

  // Get all of this coach's classes the player is enrolled in
  const sharedEnrollments = await enrollmentRepo
    .createQueryBuilder('e')
    .innerJoinAndSelect('e.masterclass', 'mc')
    .where('e.player_id = :playerId', { playerId })
    .andWhere('mc.coach_id = :coachId', { coachId })
    .orderBy('mc.session_date', 'ASC')
    .getMany();

  const sharedClasses = sharedEnrollments.map(e => ({
    id:           e.masterclass.id,
    title:        e.masterclass.title,
    session_date: e.masterclass.session_date,
    category:     e.masterclass.category,
    status:       e.status,
  }));

  return {
    id:               player.id,
    name:             player.name,
    email:            player.email,
    bio:              player.bio,
    chess_rating:     player.chess_rating,
    experience_level: player.experience_level,
    created_at:       player.created_at,
    shared_classes:   sharedClasses,
  };
};

// ─── PUBLIC COACH PROFILE ────────────────────────────────────────────
// Anyone can view a coach's public profile: name, bio, classes, avg rating.
export const getPublicCoachProfile = async (coachId: string) => {
  const coach = await userRepo.findOne({ where: { id: coachId } });
  if (!coach || coach.role !== UserRole.COACH) throw new Error('Coach not found');
  if (!coach.is_approved) throw new Error('Coach profile is not public yet');

  // Get all their masterclasses
  const classes = await masterclassRepo.find({
    where: { coach_id: coachId },
    order: { session_date: 'DESC' },
  });

  // Compute enrollment counts + reviews for each class
  const { Review } = require('../entities/Review');
  const reviewRepo = AppDataSource.getRepository(Review);

  const classesWithStats = await Promise.all(
    classes.map(async (mc: any) => {
      const enrolledCount = await enrollmentRepo.count({
        where: { masterclass_id: mc.id, status: 'active' as any },
      });
      const reviews = await reviewRepo.find({
        where: { masterclass_id: mc.id },
      });
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        id: mc.id,
        title: mc.title,
        description: mc.description,
        session_date: mc.session_date,
        category: mc.category,
        capacity: mc.capacity,
        enrolled_count: enrolledCount,
        seats_remaining: mc.capacity - enrolledCount,
        average_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews.length,
      };
    })
  );

  // Aggregate stats
  const totalStudents = classesWithStats.reduce((sum, c) => sum + c.enrolled_count, 0);
  const allRatings = classesWithStats.filter(c => c.review_count > 0);
  const overallRating = allRatings.length > 0
    ? allRatings.reduce((sum, c) => sum + c.average_rating, 0) / allRatings.length
    : 0;

  return {
    id: coach.id,
    name: coach.name,
    bio: coach.bio,
    chess_rating: coach.chess_rating,
    experience_level: coach.experience_level,
    created_at: coach.created_at,
    stats: {
      total_classes: classes.length,
      total_students: totalStudents,
      average_rating: Math.round(overallRating * 10) / 10,
      total_reviews: classesWithStats.reduce((sum, c) => sum + c.review_count, 0),
    },
    classes: classesWithStats,
  };
};

// ─── GET ALL COACHES ─────────────────────────────────────────────────
export const getAllCoaches = async (playerId?: string) => {
  const coaches = await userRepo.find({
    where: { role: UserRole.COACH, is_approved: true },
    select: ['id', 'name', 'bio', 'chess_rating', 'experience_level'],
  });

  const favRepo = AppDataSource.getRepository(FavoriteCoach);
  let userFavorites: string[] = [];
  if (playerId) {
    const favs = await favRepo.find({ where: { player_id: playerId } });
    userFavorites = favs.map(f => f.coach_id);
  }

  return coaches.map(coach => ({
    ...coach,
    is_favorite: userFavorites.includes(coach.id),
  }));
};

// ─── TOGGLE FAVORITE COACH ───────────────────────────────────────────
export const toggleFavoriteCoach = async (playerId: string, coachId: string) => {
  const coach = await userRepo.findOne({ where: { id: coachId } });
  if (!coach || coach.role !== UserRole.COACH || !coach.is_approved) {
    throw new Error('Coach not found or not approved');
  }

  const favRepo = AppDataSource.getRepository(FavoriteCoach);
  const existing = await favRepo.findOne({ where: { player_id: playerId, coach_id: coachId } });

  if (existing) {
    await favRepo.remove(existing);
    return { is_favorite: false, message: 'Removed from favorites' };
  } else {
    const favorite = favRepo.create({ player_id: playerId, coach_id: coachId });
    await favRepo.save(favorite);
    return { is_favorite: true, message: 'Added to favorites' };
  }
};

// ─── GET FAVORITE COACHES ────────────────────────────────────────────
export const getFavoriteCoaches = async (playerId: string) => {
  const favRepo = AppDataSource.getRepository(FavoriteCoach);
  const favs = await favRepo.find({
    where: { player_id: playerId },
    relations: ['coach'],
  });

  return favs.map(f => ({
    id: f.coach.id,
    name: f.coach.name,
    bio: f.coach.bio,
    chess_rating: f.coach.chess_rating,
    experience_level: f.coach.experience_level,
  }));
};
