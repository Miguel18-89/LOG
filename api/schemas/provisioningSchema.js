import { z } from 'zod';


export const createProvisioningSchema = z.object({
  ordered: z.boolean().optional(),
  trackingNumber: z.string().optional(),
  received: z.boolean().optional(),
  validated: z.boolean().optional(),
  status: z.number().int().min(0).max(2).optional(),
  updated_by: z.string().uuid().optional(),
  storeId: z.string().uuid(),
});
