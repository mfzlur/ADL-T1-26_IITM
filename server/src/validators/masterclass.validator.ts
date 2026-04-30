import { z } from 'zod';

export const createMasterclassSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  session_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date string',
  }),
  category: z.enum(['opening', 'middlegame', 'endgame', 'tactics']),
  capacity: z.preprocess((val) => Number(val), z.number().int().positive()),
  video_url: z.string().url().optional().or(z.literal('')),
});

export const updateMasterclassSchema = createMasterclassSchema.partial();
