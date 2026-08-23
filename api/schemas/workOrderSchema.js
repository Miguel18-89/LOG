const { z } = require('zod');

const TYPE_VALID = ['instalacao', 'manutencao', 'reparacao'];
const STATUS_VALID = ['em_curso', 'concluida'];
const DOC_KINDS = ['documento', 'foto'];

// Aceita "HH:MM" (24h) ou vazio — mesmo formato usado nos registos de horas extra.
const timeField = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Hora inválida (use HH:MM)' })
    .or(z.literal(''))
    .transform(v => (v === '' ? null : v))
    .nullish();

const workOrderBaseSchema = z.object({
    client: z.string().trim().min(1, { message: 'Cliente obrigatório' }).max(150),
    obra: z.string().trim().min(1, { message: 'Obra obrigatória' }).max(200),
    type: z.enum(TYPE_VALID, { message: 'Tipo de trabalho inválido' }),
    status: z.enum(STATUS_VALID, { message: 'Estado inválido' }).optional(),
    date: z.coerce.date(),
    startTime: timeField,
    endTime: timeField,
    tasks: z.string().trim().min(1, { message: 'Descrição das tarefas obrigatória' }),
    materials: z.string().trim().min(1, { message: 'Descrição dos materiais obrigatória' }),
    notes: z.string().trim().optional(),
    technicianIds: z.array(z.string().uuid()).optional().default([]),
});

// No update todos os campos são opcionais, mas os que vierem têm de continuar válidos.
const updateWorkOrderSchema = workOrderBaseSchema.partial();

const signatureSchema = z.object({
    signatureData: z.string().regex(/^data:image\/png;base64,/, {
        message: 'Assinatura inválida',
    }),
    signedByName: z.string().trim().min(1, { message: 'Indique quem assinou' }).max(150),
});

const sendReportSchema = z.object({
    pdf: z.string().min(1, { message: 'PDF em falta' }),
    clientEmail: z.string().email({ message: 'Email do cliente inválido' }).optional(),
    sendToCompany: z.boolean().optional().default(true),
    message: z.string().trim().optional(),
});

module.exports = {
    TYPE_VALID,
    STATUS_VALID,
    DOC_KINDS,
    workOrderSchema: workOrderBaseSchema,
    updateWorkOrderSchema,
    signatureSchema,
    sendReportSchema,
};
