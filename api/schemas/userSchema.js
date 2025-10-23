import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(6, 'A senha deve ter pelo menos 6 caracteres')
  .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial')
  

export const createUserSchema = z.object({
  name: z.string().min(2, 'O nome deve conter 2 ou mais letras'),
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(['0', '1', '2']).transform(Number).optional(),
  is_active: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'O nome deve conter 2 ou mais letras'),
  password: passwordSchema.optional(),
  role: z.enum(['0', '1', '2']).transform(Number).optional(),
  is_active: z.boolean().optional(),
  approved: z.boolean().optional(),
});