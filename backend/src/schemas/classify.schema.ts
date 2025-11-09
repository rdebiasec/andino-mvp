import { z } from 'zod';

export const ClassifyInput = z.object({
  text: z
    .string({ required_error: 'text requerido' })
    .trim()
    .min(1, 'text requerido')
    .max(2000, 'máximo 2000 caracteres'),
  channel: z.enum(['web', 'whatsapp', 'email']).optional()
});

export type ClassifyInput = z.infer<typeof ClassifyInput>;
