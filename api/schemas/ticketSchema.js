const { z } = require('zod');

// As listas brancas de anexos são as mesmas das obras — a regra de que ficheiros
// se aceitam não muda de módulo para módulo, e duplicá-las era garantir que uma
// delas ficava para trás na próxima revisão.
const {
    DOC_KINDS, ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_MIMES,
} = require('./workOrderSchema.js');

const TYPE_VALID = ['assistencia', 'tarefa'];
const PRIORITY_VALID = ['baixa', 'normal', 'alta', 'urgente'];
const STATUS_VALID = ['aberto', 'atribuido', 'em_curso', 'fechado', 'cancelado'];

// Campos cuja alteração fica registada na linha de tempo, com valor antigo e novo.
// A descrição fica de fora de propósito: guardar todas as versões de um campo
// longo cresce sem limite e ninguém as lê — regista-se só que foi editada.
const TRACKED_FIELDS = [
    'status', 'assignee_id', 'priority', 'expectedDate', 'dueDate', 'title', 'type',
];

/**
 * Texto opcional que pode ser limpo.
 * Ausente significa "não mexer"; string vazia significa "apagar o que lá está".
 * Sem esta distinção não havia como esvaziar o cliente de um ticket.
 */
const optionalText = (max) => z
    .string()
    .trim()
    .max(max, { message: `Campo demasiado longo (máximo ${max} caracteres)` })
    .optional()
    .transform(v => (v === '' ? null : v));

/** Data opcional, com a mesma distinção entre ausente e vazio. */
const optionalDate = z
    // A ordem importa: z.coerce.date() sobre "" devolve Invalid Date, por isso o
    // literal vazio tem de ser testado primeiro.
    .union([z.literal(''), z.null(), z.coerce.date()])
    .optional()
    .transform(v => (v === '' || v === null ? null : v));

/** Responsável: um uuid, ou vazio para deixar o ticket sem dono. */
const optionalUserId = z
    .union([z.literal(''), z.null(), z.string().uuid({ message: 'Responsável inválido' })])
    .optional()
    .transform(v => (v === '' || v === null ? null : v));

// Sem .default() em nenhum campo, de propósito: num update parcial o default
// preenche o campo e sobrepõe-se ao que já lá estava. Foi assim que um update de
// estado apagou os técnicos de uma obra. Ausente tem de significar ausente — os
// valores por omissão estão no schema da base de dados, onde só valem na criação.
const ticketBaseSchema = z.object({
    type: z.enum(TYPE_VALID, { message: 'Tipo de ticket inválido' }),
    title: z.string().trim().min(1, { message: 'Assunto obrigatório' }).max(200),
    description: z.string().trim().min(1, { message: 'Descrição obrigatória' }).max(10000),
    client: optionalText(150),
    location: optionalText(200),
    requestedBy: optionalText(150),
    priority: z.enum(PRIORITY_VALID, { message: 'Prioridade inválida' }).optional(),
    status: z.enum(STATUS_VALID, { message: 'Estado inválido' }).optional(),
    expectedDate: optionalDate,
    dueDate: optionalDate,
    closingNote: optionalText(2000),
    assignee_id: optionalUserId,
});

// No update todos os campos são opcionais, mas os que vierem têm de continuar válidos.
const updateTicketSchema = ticketBaseSchema.partial();

const messageSchema = z.object({
    message: z
        .string()
        .trim()
        .min(1, { message: 'Escreva uma mensagem' })
        .max(5000, { message: 'Mensagem demasiado longa' }),
});

const linkWorkOrderSchema = z.object({
    workOrderId: z.string().uuid({ message: 'Obra inválida' }),
});

const linkRmaSchema = z.object({
    rmaId: z.string().uuid({ message: 'RMA inválido' }),
});

module.exports = {
    TYPE_VALID,
    PRIORITY_VALID,
    STATUS_VALID,
    TRACKED_FIELDS,
    DOC_KINDS,
    ALLOWED_UPLOAD_EXTS,
    ALLOWED_UPLOAD_MIMES,
    ticketSchema: ticketBaseSchema,
    updateTicketSchema,
    messageSchema,
    linkWorkOrderSchema,
    linkRmaSchema,
};
