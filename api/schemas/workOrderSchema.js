const { z } = require('zod');

const TYPE_VALID = ['instalacao', 'manutencao', 'reparacao'];
const STATUS_VALID = ['em_curso', 'concluida'];
const DOC_KINDS = ['documento', 'foto'];

// Lista branca de anexos. Sem isto era possível carregar .html/.svg com <script>,
// que ficavam guardados no servidor e eram devolvidos como conteúdo executável.
const ALLOWED_UPLOAD_EXTS = [
    '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif',
    '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.dwg', '.dxf',
];

const ALLOWED_UPLOAD_MIMES = [
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain',
    'application/acad', 'image/vnd.dwg', 'image/vnd.dxf', 'application/octet-stream',
];

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
    // Sem .default() de propósito: num update parcial o default preencheria []
    // e apagaria os técnicos já associados. Ausente tem de significar ausente.
    technicianIds: z.array(z.string().uuid()).optional(),
    // Nomes de técnicos ocasionais. Aceita a lista como vem e limpa aqui: espaços,
    // entradas vazias e duplicados são descartados em vez de darem erro 400.
    externalTechnicians: z
        .array(z.string().max(150))
        .optional()
        .transform(list => (
            list === undefined ? undefined : [...new Set(list.map(s => s.trim()).filter(Boolean))]
        )),
});

// No update todos os campos são opcionais, mas os que vierem têm de continuar válidos.
const updateWorkOrderSchema = workOrderBaseSchema.partial();

// Valida a string INTEIRA, não só o prefixo: antes, tudo o que viesse a seguir a
// "data:image/png;base64," era aceite, incluindo aspas e tags HTML que depois eram
// interpoladas no template do relatório.
const PNG_DATA_URI = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_SIGNATURE_CHARS = 2_000_000;

const signatureSchema = z.object({
    signatureData: z
        .string()
        .max(MAX_SIGNATURE_CHARS, { message: 'Assinatura demasiado grande' })
        .regex(PNG_DATA_URI, { message: 'Assinatura inválida' }),
    signedByName: z.string().trim().min(1, { message: 'Indique quem assinou' }).max(150),
});

// O PDF é gerado no cliente, por isso confirma-se que é mesmo um PDF (base64 de "%PDF-")
// antes de o anexar a um email enviado a partir do domínio da empresa.
const PDF_BASE64 = /^[A-Za-z0-9+/\r\n]+={0,2}$/;

const sendReportSchema = z.object({
    pdf: z
        .string()
        .min(1, { message: 'PDF em falta' })
        .refine(v => PDF_BASE64.test(v), { message: 'Anexo inválido' })
        .refine(v => Buffer.from(v, 'base64').subarray(0, 5).toString('latin1') === '%PDF-', {
            message: 'O anexo não é um ficheiro PDF válido',
        }),
    clientEmail: z.string().email({ message: 'Email do cliente inválido' }).optional(),
    sendToCompany: z.boolean().optional().default(true),
    message: z.string().trim().max(2000, { message: 'Mensagem demasiado longa' }).optional(),
});

module.exports = {
    TYPE_VALID,
    STATUS_VALID,
    DOC_KINDS,
    ALLOWED_UPLOAD_EXTS,
    ALLOWED_UPLOAD_MIMES,
    workOrderSchema: workOrderBaseSchema,
    updateWorkOrderSchema,
    signatureSchema,
    sendReportSchema,
};
