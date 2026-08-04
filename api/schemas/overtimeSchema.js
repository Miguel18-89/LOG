const { z } = require('zod');

const today = () => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; };

const RECORD_TYPES = ['trabalho', 'ferias', 'falta', 'feriado'];
const NIGHT_TYPES_REQUIRING_CLIENT = ['trabalhada', 'fora_de_casa'];

// Só aplicável à criação: no update, os campos em falta são preenchidos a partir do registo
// atual (ver overtimeController.updateOvertime), pelo que exigi-los aqui bloquearia updates
// parciais legítimos (ex: só mudar o nightType de um registo já existente).
function withCreateRefinements(schema) {
    return schema.superRefine((data, ctx) => {
        const recordType = data.recordType ?? 'trabalho';
        if (recordType !== 'trabalho') return;

        if (!data.entryTime) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['entryTime'], message: 'Hora de entrada obrigatória' });
        }
        if (!data.exitTime) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exitTime'], message: 'Hora de saída obrigatória' });
        }
        if (data.nightType && NIGHT_TYPES_REQUIRING_CLIENT.includes(data.nightType)) {
            if (!data.client) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['client'], message: 'Cliente obrigatório' });
            if (!data.obra) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['obra'], message: 'Obra/local obrigatório' });
        }
    });
}

const createOvertimeSchema = withCreateRefinements(z.object({
    date: z.coerce.date().refine(d => d <= today(), { message: 'Não é permitido registar datas futuras' }),
    recordType: z.enum(RECORD_TYPES).default('trabalho'),
    entryTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de entrada inválida (formato HH:MM)' }).optional(),
    exitTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora de saída inválida (formato HH:MM)' }).optional(),
    dinner: z.boolean().default(false),
    weekendLunch: z.boolean().default(false),
    isHoliday: z.boolean().optional(),
    exitIsHoliday: z.boolean().optional(),
    hours50: z.coerce.number().min(0).optional(),
    hours75: z.coerce.number().min(0).optional(),
    hours100: z.coerce.number().min(0).optional(),
    nightType: z.string().optional(),
    client: z.string().optional(),
    obra: z.string().optional(),
}));

const updateOvertimeSchema = z.object({
    date: z.coerce.date().refine(d => d <= today(), { message: 'Não é permitido registar datas futuras' }).optional(),
    recordType: z.enum(RECORD_TYPES).optional(),
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
    client: z.string().optional(),
    obra: z.string().optional(),
});

const MAX_VACATION_BUSINESS_DAYS = 15;

const vacationPeriodSchema = z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
}).refine(data => data.endDate >= data.startDate, {
    message: 'A data de fim deve ser igual ou posterior à data de início',
    path: ['endDate'],
});

module.exports = {
    createOvertimeSchema,
    updateOvertimeSchema,
    vacationPeriodSchema,
    MAX_VACATION_BUSINESS_DAYS,
    RECORD_TYPES,
};
