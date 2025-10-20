import { z } from 'zod';

export const createStoreSchema = z.object({
  storeName: z.string().min(1, 'Nome da loja é obrigatório'),
  storeNumber: z.coerce.number()
    .int('Número da loja deve ser um número inteiro')
    .positive('Número da loja deve ser positivo'),
  storeAddress: z.string().min(1, 'Endereço da loja é obrigatório'),
  storeRegion: z.string().min(1, 'Região da loja é obrigatória'),
  storeInspectorName: z.string().min(1, 'Nome do fiscal é obrigatório'),
  storeInspectorContact: z.coerce.number()
    .int('Contato da fiscalização deve ser um número inteiro')
    .positive('Contato da fiscalização deve ser positivo'),
  createdById: z.string().uuid('ID de utilizador inválido'),
});

export const updateStoreSchema = z.object({
  storeName: z.string().min(1).optional(),
  storeNumber: z.coerce.number().int().positive().optional(),
  storeAddress: z.string().min(1).optional(),
  storeRegion: z.string().min(1).optional(),
  storeArea: z.string().min(1).optional(),
  storeInspectorName: z.string().min(1).optional(),
  storeInspectorContact: z.coerce.number().int().positive().optional(),
  userId: z.string().uuid().optional(),
});