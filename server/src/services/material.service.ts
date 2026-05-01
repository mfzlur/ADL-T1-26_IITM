import { AppDataSource } from '../config/database';
import { ClassMaterial, MaterialType } from '../entities/ClassMaterial';
import { Masterclass } from '../entities/Masterclass';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import * as NotificationService from './notification.service';
import { NotificationType } from '../entities/Notification';

const materialRepo    = AppDataSource.getRepository(ClassMaterial);
const masterclassRepo = AppDataSource.getRepository(Masterclass);
const enrollmentRepo  = AppDataSource.getRepository(Enrollment);

// ─── CREATE MATERIAL ────────────────────────────────────────────────
export const addMaterial = async (
  coachId: string,
  masterclassId: string,
  data: {
    type: MaterialType;
    title: string;
    description?: string;
    url: string;
    sort_order?: number;
  }
) => {
  const mc = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!mc) throw new Error('Masterclass not found');
  if (mc.coach_id !== coachId) throw new Error('You can only add materials to your own classes');

  const maxOrder = await materialRepo
    .createQueryBuilder('m')
    .select('MAX(m.sort_order)', 'max')
    .where('m.masterclass_id = :id', { id: masterclassId })
    .getRawOne();
  const sortOrder = data.sort_order ?? ((maxOrder?.max ?? -1) + 1);

  const material = materialRepo.create({
    ...data,
    sort_order: sortOrder,
    masterclass_id: masterclassId,
  });

  const saved = await materialRepo.save(material);

  await notifyEnrolledStudents(
    masterclassId,
    mc.title,
    `New ${data.type} added: "${data.title}"`
  );

  return saved;
};

// ─── GET MATERIALS FOR CLASS ────────────────────────────────────────
export const getMaterials = async (masterclassId: string) => {
  return await materialRepo.find({
    where: { masterclass_id: masterclassId },
    order: { sort_order: 'ASC', created_at: 'ASC' },
  });
};

// ─── UPDATE MATERIAL ─────────────────────────────────────────────────
export const updateMaterial = async (
  coachId: string,
  materialId: number,
  data: Partial<{
    type: MaterialType;
    title: string;
    description: string | null;
    url: string;
    sort_order: number;
  }>
) => {
  const material = await materialRepo.findOne({
    where: { id: materialId },
    relations: ['masterclass'],
  });
  if (!material) throw new Error('Material not found');
  if (material.masterclass.coach_id !== coachId) {
    throw new Error('You can only edit materials for your own classes');
  }

  const updated = materialRepo.merge(material, data);
  return await materialRepo.save(updated);
};

// ─── DELETE MATERIAL ─────────────────────────────────────────────────
export const deleteMaterial = async (coachId: string, materialId: number) => {
  const material = await materialRepo.findOne({
    where: { id: materialId },
    relations: ['masterclass'],
  });
  if (!material) throw new Error('Material not found');
  if (material.masterclass.coach_id !== coachId) {
    throw new Error('You can only delete materials from your own classes');
  }

  await materialRepo.remove(material);
  return { message: 'Material deleted' };
};

// ─── REORDER MATERIALS ──────────────────────────────────────────────
export const reorderMaterials = async (
  coachId: string,
  masterclassId: string,
  materialIds: number[]
) => {
  const mc = await masterclassRepo.findOne({ where: { id: masterclassId } });
  if (!mc) throw new Error('Masterclass not found');
  if (mc.coach_id !== coachId) throw new Error('Not your class');

  // CHANGED: for(let i) → for...of with .entries()
  // noUncheckedIndexedAccess widens materialIds[i] to number | undefined.
  // .entries() destructuring is always in-bounds — TypeScript infers [number, number],
  // so `id` is definitively number with no undefined widening.
  for (const [i, id] of materialIds.entries()) {
    await materialRepo.update(id, { sort_order: i });
  }

  return { message: 'Materials reordered' };
};

// ─── NOTIFY ALL ENROLLED STUDENTS ───────────────────────────────────
export const notifyEnrolledStudents = async (
  masterclassId: string,
  classTitle: string,
  detail: string
) => {
  const enrollments = await enrollmentRepo.find({
    where: { masterclass_id: masterclassId, status: EnrollmentStatus.ACTIVE },
  });

  const notifications = enrollments.map(e =>
    NotificationService.createNotification({
      user_id: e.player_id,
      type: NotificationType.CLASS_UPDATED,
      title: `Class Updated: ${classTitle}`,
      message: detail,
    })
  );

  await Promise.all(notifications);
};
