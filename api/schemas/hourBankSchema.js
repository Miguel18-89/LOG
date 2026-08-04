const { z } = require('zod');

const updateRateSchema = z.object({
    hourlyRate: z.coerce.number().positive({ message: 'A taxa horária deve ser um valor positivo' }),
});

const adjustmentSchema = z.object({
    date: z.coerce.date(),
    description: z.string().optional(),
    value: z.coerce.number().refine(v => v !== 0, { message: 'O valor não pode ser zero' }),
});

const expenseSchema = z.object({
    date: z.coerce.date(),
    description: z.string().min(1, { message: 'Descrição obrigatória' }),
    value: z.coerce.number().positive({ message: 'O valor deve ser positivo' }),
});

const creditSchema = z.object({
    year: z.coerce.number().int(),
    month: z.coerce.number().int().min(1).max(12),
    hours50: z.coerce.number().min(0).default(0),
    hours75: z.coerce.number().min(0).default(0),
    hours100: z.coerce.number().min(0).default(0),
});

module.exports = { updateRateSchema, adjustmentSchema, expenseSchema, creditSchema };
