import { z } from 'zod';

export const createPhase2Schema = z.object({
  kls: z.boolean().optional(),
  acrylics: z.boolean().optional(),
  hotButtons: z.boolean().optional(),
  eas: z.boolean().optional(),
  tiko: z.boolean().optional(),
  ovens: z.boolean().optional(),
  quailDigital: z.boolean().optional(),
  smc: z.boolean().optional(),
  amplifier: z.boolean().optional(),
  tests: z.boolean().optional(),
  status: z.number().int().min(0).max(2).optional(),
  storeId: z.string().uuid({ message: 'storeId inválido' }),
  userId: z.string().uuid({ message: 'userId inválido' }),
});
