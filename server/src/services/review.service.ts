import { AppDataSource } from '../config/database';
import { Review } from '../entities/Review';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { Masterclass } from '../entities/Masterclass';
import { User } from '../entities/User';
import * as NotificationService from './notification.service';
import { NotificationType } from '../entities/Notification';

const reviewRepo     = AppDataSource.getRepository(Review);
const enrollmentRepo = AppDataSource.getRepository(Enrollment);
const masterclassRepo = AppDataSource.getRepository(Masterclass);

// ─── CREATE ──────────────────────────────────────────────────────────
export const createReview = async (
  playerId:      string,
  masterclassId: string,
  rating:        number,
  comment?:      string
) => {
  const masterclass = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!masterclass) throw new Error('Masterclass not found');

  const enrollment = await enrollmentRepo.findOne({
    where: { player_id: playerId, masterclass_id: masterclassId, status: EnrollmentStatus.ACTIVE },
  });
  if (!enrollment) {
    throw new Error('You must be enrolled in this class to leave a review');
  }

  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

  const existing = await reviewRepo.findOne({
    where: { player_id: playerId, masterclass_id: masterclassId },
  });
  if (existing) throw new Error('You have already reviewed this masterclass');

  const review = reviewRepo.create({
    player_id:      playerId,
    masterclass_id: masterclassId,
    rating,
    comment: comment || null,
  });

  await reviewRepo.save(review);

  // Get info for notification
  const userRepo = AppDataSource.getRepository(User);
  const player = await userRepo.findOne({ where: { id: playerId } });
  if (player) {
    await NotificationService.createNotification({
      user_id: masterclass.coach_id,
      type: NotificationType.REVIEW_RECEIVED,
      title: 'New Review Received',
      message: `${player.name} left a ${rating}-star review on your class "${masterclass.title}".`
    });
  }

  return review;
};

// ─── UPDATE (Phase 6A) ────────────────────────────────────────────────
// Player can change their rating and/or comment after submitting.
// Ownership enforced — only the author can update.
export const updateReview = async (
  playerId:      string,
  masterclassId: string,
  data: { rating?: number; comment?: string | null }
) => {
  const review = await reviewRepo.findOne({
    where: { player_id: playerId, masterclass_id: masterclassId },
  });
  if (!review) throw new Error('Review not found — you have not reviewed this class');

  if (data.rating !== undefined) {
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    review.rating = data.rating;
  }

  if (data.comment !== undefined) {
    review.comment = data.comment;
  }

  await reviewRepo.save(review);
  return review;
};

// ─── GET BY CLASS ─────────────────────────────────────────────────────
export const getReviewsByClass = async (masterclassId: string) => {
  const masterclass = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!masterclass) throw new Error('Masterclass not found');

  const reviews = await reviewRepo.find({
    where:     { masterclass_id: masterclassId },
    relations: ['player'],
    order:     { created_at: 'DESC' },
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    masterclass_title: masterclass.title,
    total_reviews:     reviews.length,
    average_rating:    Math.round(avgRating * 10) / 10,
    reviews: reviews.map(r => ({
      id:          r.id,
      rating:      r.rating,
      comment:     r.comment,
      created_at:  r.created_at,
      player_name: r.player?.name,
    })),
  };
};

// ─── DELETE (player deletes own review) ───────────────────────────────
export const deleteReview = async (playerId: string, masterclassId: string) => {
  const review = await reviewRepo.findOne({
    where: { player_id: playerId, masterclass_id: masterclassId },
  });
  if (!review) throw new Error('Review not found');
  await reviewRepo.remove(review);
  return { message: 'Review deleted successfully' };
};
