const { z } = require('zod');

const today = () => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; };

const createOvertimeSchema = z.object({
    date: z.coerce.date().refine(d => d <= today(), { message: 'Não é permitido registar datas futuras' }),
    entryTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de entrada inválida (formato HH:MM)' }),
    exitTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de saída inválida (formato HH:MM)' }),
    dinner: z.boolean().default(false),
    weekendLunch: z.boolean().default(false),
    isHoliday: z.boolean().optional(),
    exitIsHoliday: z.boolean().optional(),
    hours50: z.coerce.number().min(0).optional(),
    hours75: z.coerce.number().min(0).optional(),
    hours100: z.coerce.number().min(0).optional(),
    nightType: z.string().optional(),
});

const updateOvertimeSchema = z.object({
    date: z.coerce.date().refine(d => d <= today(), { message: 'Não é permitido registar datas futuras' }).optional(),
    entryTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de entrada inválida (formato HH:MM)' }).optional(),
    exitTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de saída inválida (formato HH:MM)' }).optional(),
    dinner: z.boolean().optional(),
    weekendLunch: z.boolean().optional(),
    isHoliday: z.boolean().optional(),
    exitIsHoliday: z.boolean().optional(),
    hours50: z.coerce.number().min(0).optional(),
    hours75: z.coerce.number().min(0).optional(),
    hours100: z.coerce.number().min(0).optional(),
    nightType: z.string().optional(),
});

module.exports = { createOvertimeSchema, updateOvertimeSchema };
