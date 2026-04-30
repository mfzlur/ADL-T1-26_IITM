import { z } from 'zod';

export const CreateReviewSchema = z.object({
  rating: z.preprocess((val) => Number(val), z.number().int().min(1).max(5)),
  comment: z.string().optional()
});

export type CreateReviewBody = z.infer<typeof CreateReviewSchema>;
