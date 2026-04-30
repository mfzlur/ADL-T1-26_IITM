import { AppDataSource } from '../config/database';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { Masterclass } from '../entities/Masterclass';
import { User, UserRole } from '../entities/User';
import * as NotificationService from './notification.service';
import { NotificationType } from '../entities/Notification';

const enrollmentRepo  = AppDataSource.getRepository(Enrollment);
const masterclassRepo = AppDataSource.getRepository(Masterclass);
const userRepo        = AppDataSource.getRepository(User);

// ─── ENROLL ──────────────────────────────────────────────────────────
export const enroll = async (playerId: string, masterclassId: string) => {
  return await AppDataSource.transaction(async (manager) => {
    const enrollRepo = manager.getRepository(Enrollment);
    const mcRepo     = manager.getRepository(Masterclass);

    // 1. Masterclass exists
    const masterclass = await mcRepo.findOne({
      where:     { id: masterclassId },
      relations: ['coach'],
    });
    if (!masterclass) throw new Error('Masterclass not found');

    // Phase 9A Fix 1 ─ past-session guard
    // Prevents ghost enrollments in classes that have already taken place.
    if (masterclass.session_date < new Date()) {
      throw new Error('This masterclass has already taken place and is no longer open for enrollment');
    }

    // 2. Coaches cannot enroll in their own class
    if (masterclass.coach_id === playerId) {
      throw new Error('Coaches cannot enroll in their own masterclass');
    }

    // 3. Verify player role
    const player = await userRepo.findOne({ where: { id: playerId } });
    if (!player || player.role !== UserRole.PLAYER) {
      throw new Error('Only players can enroll in masterclasses');
    }

    // 4. Already enrolled or waitlisted?
    const existing = await enrollRepo.findOne({
      where: { player_id: playerId, masterclass_id: masterclassId },
    });
    if (existing) {
      throw new Error(
        existing.status === EnrollmentStatus.ACTIVE
          ? 'You are already enrolled in this masterclass'
          : 'You are already on the waitlist for this masterclass'
      );
    }

    // 5. Decide status
    const activeCount = await enrollRepo.count({
      where: {
        masterclass_id: masterclassId,
        status:         EnrollmentStatus.ACTIVE,
      },
    });

    const status =
      activeCount < masterclass.capacity
        ? EnrollmentStatus.ACTIVE
        : EnrollmentStatus.WAITLISTED;

    // 6. Create enrollment
    const enrollment = enrollRepo.create({
      player_id:      playerId,
      masterclass_id: masterclassId,
      status,
    });
    await enrollRepo.save(enrollment);

    // Notify Coach of new enrollment
    await NotificationService.createNotification({
      user_id: masterclass.coach_id,
      type: NotificationType.ENROLLMENT_NEW,
      title: 'New Student Enrollment',
      message: `${player.name} has ${status === EnrollmentStatus.ACTIVE ? 'enrolled in' : 'joined the waitlist for'} your class "${masterclass.title}".`
    });

    // Phase 9A Fix 2 ─ compute waitlist position so the frontend can
    // immediately show "#3 in queue" without a second API call.
    let waitlist_position: number | undefined;
    if (status === EnrollmentStatus.WAITLISTED) {
      // Count all waitlisted entries for this class with an earlier
      // enrolled_at — that's how many people are ahead in the queue.
      const ahead = await enrollRepo
        .createQueryBuilder('e')
        .where('e.masterclass_id = :mcId',      { mcId: masterclassId })
        .andWhere('e.status = :status',          { status: EnrollmentStatus.WAITLISTED })
        .andWhere('e.enrolled_at < :enrolledAt', { enrolledAt: enrollment.enrolled_at })
        .getCount();
      waitlist_position = ahead + 1;
    }

    return {
      ...enrollment,
      status,
      waitlist_position,
      message:
        status === EnrollmentStatus.ACTIVE
          ? '✅ Successfully enrolled!'
          : `⏳ Class is full. You are #${waitlist_position} on the waitlist.`,
    };
  });
};

// ─── CANCEL + AUTO-PROMOTE ────────────────────────────────────────────
export const cancelEnrollment = async (
  playerId:      string,
  masterclassId: string
) => {
  return await AppDataSource.transaction(async (manager) => {
    const enrollRepo = manager.getRepository(Enrollment);

    const enrollment = await enrollRepo.findOne({
      where: { player_id: playerId, masterclass_id: masterclassId },
    });
    if (!enrollment) throw new Error('You are not enrolled in this masterclass');

    const wasActive = enrollment.status === EnrollmentStatus.ACTIVE;
    await enrollRepo.remove(enrollment);

    // Get info for notification
    const player = await userRepo.findOne({ where: { id: playerId } });
    const mc = await manager.getRepository(Masterclass).findOne({ where: { id: masterclassId } });
    if (mc && player) {
      await NotificationService.createNotification({
        user_id: mc.coach_id,
        type: NotificationType.ENROLLMENT_CANCELLED,
        title: 'Enrollment Cancelled',
        message: `${player.name} has cancelled their enrollment for your class "${mc.title}".`
      });
    }

    // Auto-promote first waitlisted player (FIFO)
    if (wasActive) {
      const firstWaitlisted = await enrollRepo.findOne({
        where: {
          masterclass_id: masterclassId,
          status:         EnrollmentStatus.WAITLISTED,
        },
        order: { enrolled_at: 'ASC' },
      });

      if (firstWaitlisted) {
        firstWaitlisted.status = EnrollmentStatus.ACTIVE;
        await enrollRepo.save(firstWaitlisted);

        // Notify the promoted player
        const mc = await masterclassRepo.findOne({ where: { id: masterclassId } });
        await NotificationService.createNotification({
          user_id: firstWaitlisted.player_id,
          type: NotificationType.WAITLIST_PROMOTED,
          title: 'You got a seat! 🎉',
          message: `A spot opened up in "${mc?.title ?? 'a masterclass'}". You have been moved from the waitlist to active enrollment.`,
        });

        return {
          message:             'Enrollment cancelled. A waitlisted player has been promoted.',
          promoted_player_id:  firstWaitlisted.player_id,
        };
      }
    }

    return { message: 'Enrollment cancelled successfully.' };
  });
};

// ─── MY ENROLLMENTS (player dashboard) ──────────────────────────────
// Phase 9A Fix 3 — attaches waitlist_position to each waitlisted entry.
// One extra query per waitlisted class (acceptable: players rarely hold
// more than 2–3 waitlist spots simultaneously).
export const getMyEnrollments = async (playerId: string) => {
  const enrollments = await enrollmentRepo.find({
    where:     { player_id: playerId },
    relations: ['masterclass', 'masterclass.coach'],
    order:     { enrolled_at: 'DESC' },
  });

  const active      = enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE);
  const waitlisted  = enrollments.filter(e => e.status === EnrollmentStatus.WAITLISTED);

  // Compute queue position for each waitlisted enrollment
  const waitlistedWithPosition = await Promise.all(
    waitlisted.map(async (e) => {
      const ahead = await enrollmentRepo
        .createQueryBuilder('e2')
        .where('e2.masterclass_id = :mcId',      { mcId: e.masterclass_id })
        .andWhere('e2.status = :status',          { status: EnrollmentStatus.WAITLISTED })
        .andWhere('e2.enrolled_at < :enrolledAt', { enrolledAt: e.enrolled_at })
        .getCount();
      return { ...e, waitlist_position: ahead + 1 };
    })
  );

  return { active, waitlisted: waitlistedWithPosition };
};

// ─── CLASS STUDENTS (coach dashboard) ────────────────────────────────
export const getClassStudents = async (
  masterclassId: string,
  coachId:       string
) => {
  const masterclass = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!masterclass) throw new Error('Masterclass not found');
  if (masterclass.coach_id !== coachId) {
    throw new Error('You can only view students of your own masterclasses');
  }

  const enrollments = await enrollmentRepo.find({
    where:     { masterclass_id: masterclassId },
    relations: ['player'],
    order:     { status: 'ASC', enrolled_at: 'ASC' },
  });

  const active     = enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE);
  const waitlisted = enrollments.filter(e => e.status === EnrollmentStatus.WAITLISTED);

  return {
    masterclass_title: masterclass.title,
    capacity:          masterclass.capacity,
    enrolled_count:    active.length,
    waitlist_count:    waitlisted.length,
    seats_remaining:   masterclass.capacity - active.length,
    active,
    // Attach queue position to each waitlisted student
    waitlisted: waitlisted.map((e, idx) => ({
      ...e,
      waitlist_position: idx + 1,
    })),
  };
};
