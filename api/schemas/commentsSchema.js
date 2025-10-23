import { z } from 'zod';

export const commentsSchema = z.object({
  storeId: z.string().uuid({ message: 'storeId inválido' }),
  userId: z.string().uuid({ message: 'userId inválido' }),
  message: z.string().min(1, { message: 'A mensagem não pode estar vazia' }),
  updated: z.boolean().optional(),
  created_at: z.coerce.date().optional(),
});
