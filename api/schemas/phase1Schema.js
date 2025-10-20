import { z } from 'zod';

export const createPhase1Schema = z.object({
  cablesSalesArea: z.boolean().optional(),
  cablesBakery: z.boolean().optional(),
  cablesWarehouse: z.boolean().optional(),
  cablesBackoffice: z.boolean().optional(),
  speakersSalesArea: z.boolean().optional(),
  speakersBakery: z.boolean().optional(),
  speakersWarehouse: z.boolean().optional(),
  speakersBackoffice: z.boolean().optional(),
  status: z.number().int().min(0).max(2).optional(),
  userId: z.string().uuid({ message: 'userId inválido' }).optional(),
  storeId: z.string().uuid({ message: 'storeId inválido' }),
});
