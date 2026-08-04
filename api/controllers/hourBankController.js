const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { updateRateSchema, adjustmentSchema, expenseSchema, creditSchema } = require('../schemas/hourBankSchema.js');

const EPSILON = 1e-9;

// A taxa horária guardada no utilizador é a taxa BASE; cada escalão de hora extra acresce a
// respetiva percentagem sobre essa base (hora a 100% = taxa base + 100%, etc.).
const TIER_MULTIPLIERS = { hours100: 2.00, hours75: 1.75, hours50: 1.50 };

function computeCreditValue(hours100, hours75, hours50, baseRate) {
    return Math.round(
        (hours100 * baseRate * TIER_MULTIPLIERS.hours100 +
            hours75 * baseRate * TIER_MULTIPLIERS.hours75 +
            hours50 * baseRate * TIER_MULTIPLIERS.hours50) * 100
    ) / 100;
}

async function getBalanceValue(userId) {
    const agg = await prisma.hourBankEntry.aggregate({
        where: { user_id: userId },
        _sum: { value: true },
    });
    return agg._sum.value || 0;
}

// Soma tudo o que já foi passado para o banco de horas nesse mês (pode haver vários envios
// separados no mesmo mês), para nunca deixar bancar duas vezes as mesmas horas.
async function getAlreadyBankedForMonth(userId, year, month) {
    const agg = await prisma.hourBankEntry.aggregate({
        where: { user_id: userId, type: 'credito', year, month },
        _sum: { hours100: true, hours75: true, hours50: true, value: true },
    });
    return {
        hours100: agg._sum.hours100 || 0,
        hours75: agg._sum.hours75 || 0,
        hours50: agg._sum.hours50 || 0,
        value: agg._sum.value || 0,
    };
}

exports.getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const type = ['ajuste', 'credito', 'despesa'].includes(req.query.type) ? req.query.type : undefined;
        const sortOrder = req.query.sort === 'asc' ? 'asc' : 'desc';
        const where = { user_id: userId, ...(type ? { type } : {}) };

        const [entries, total, balance] = await Promise.all([
            prisma.hourBankEntry.findMany({
                where,
                orderBy: { date: sortOrder },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.hourBankEntry.count({ where }),
            getBalanceValue(userId),
        ]);
        res.status(200).json({ balance, hourlyRate: req.user.hourlyRate, entries, total });
    } catch (e) {
        console.error('Erro ao obter banco de horas:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.getMonthSummary = async (req, res) => {
    try {
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        if (!year || !month) {
            return res.status(400).json({ error: 'Mês/ano em falta' });
        }
        const summary = await getAlreadyBankedForMonth(req.user.id, year, month);
        res.status(200).json(summary);
    } catch (e) {
        console.error('Erro ao obter resumo do mês:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.updateRate = async (req, res) => {
    try {
        const parseResult = updateRateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }
        const { hourlyRate } = parseResult.data;
        await prisma.user.update({ where: { id: req.user.id }, data: { hourlyRate } });
        res.status(200).json({ message: 'Taxa horária atualizada', hourlyRate });
    } catch (e) {
        console.error('Erro ao atualizar taxa horária:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.createAdjustment = async (req, res) => {
    try {
        const parseResult = adjustmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }
        const { date, description, value } = parseResult.data;
        const entry = await prisma.hourBankEntry.create({
            data: { type: 'ajuste', date, description, value, createdBy: { connect: { id: req.user.id } } },
        });
        const balance = await getBalanceValue(req.user.id);
        res.status(201).json({ message: 'Ajuste registado', entry, balance });
    } catch (e) {
        console.error('Erro ao criar ajuste:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const parseResult = expenseSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }
        const { date, description, value } = parseResult.data;
        const entry = await prisma.hourBankEntry.create({
            data: { type: 'despesa', date, description, value: -Math.abs(value), createdBy: { connect: { id: req.user.id } } },
        });
        const balance = await getBalanceValue(req.user.id);
        res.status(201).json({ message: 'Despesa registada', entry, balance });
    } catch (e) {
        console.error('Erro ao criar despesa:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

// Passa horas de um mês para o banco de horas. Os registos diários (OvertimeRecord) NUNCA são
// alterados aqui — o colaborador tem de conseguir ver sempre o seu registo de horas intacto. O
// que já foi passado para o banco é controlado só pelo ledger (HourBankEntry), comparando o total
// do mês com o que já foi bancado em envios anteriores desse mesmo mês.
exports.creditFromOvertime = async (req, res) => {
    try {
        const parseResult = creditSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }
        const { year, month, hours50, hours75, hours100 } = parseResult.data;
        const userId = req.user.id;

        if (!req.user.hourlyRate) {
            return res.status(400).json({ error: 'Defina primeiro a sua taxa horária antes de passar horas para o banco.' });
        }

        const totalRequested = hours50 + hours75 + hours100;
        if (totalRequested <= 0) {
            return res.status(400).json({ error: 'Indique pelo menos uma hora para passar para o banco.' });
        }

        const records = await prisma.overtimeRecord.findMany({
            where: {
                user_id: userId,
                recordType: 'trabalho',
                date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
            },
        });

        const monthTotal100 = records.reduce((s, r) => s + (r.hours100 || 0), 0);
        const monthTotal75 = records.reduce((s, r) => s + (r.hours75 || 0), 0);
        const monthTotal50 = records.reduce((s, r) => s + (r.hours50 || 0), 0);

        const alreadyBanked = await getAlreadyBankedForMonth(userId, year, month);
        const available100 = monthTotal100 - alreadyBanked.hours100;
        const available75 = monthTotal75 - alreadyBanked.hours75;
        const available50 = monthTotal50 - alreadyBanked.hours50;

        if (hours100 > available100 + EPSILON || hours75 > available75 + EPSILON || hours50 > available50 + EPSILON) {
            return res.status(400).json({ error: 'Não pode passar mais horas do que as ainda disponíveis (não bancadas) nesse mês.' });
        }

        if (hours50 > EPSILON && (Math.abs(hours75 - available75) > EPSILON || Math.abs(hours100 - available100) > EPSILON)) {
            return res.status(400).json({ error: 'Só pode passar horas a 50% se também passar todas as horas a 75% e a 100% ainda disponíveis desse mês.' });
        }

        const value = computeCreditValue(hours100, hours75, hours50, req.user.hourlyRate);

        await prisma.hourBankEntry.create({
            data: {
                type: 'credito',
                date: new Date(),
                hours: totalRequested,
                hours100, hours75, hours50,
                hourlyRate: req.user.hourlyRate,
                value,
                month,
                year,
                createdBy: { connect: { id: userId } },
            },
        });

        const newBalance = await getBalanceValue(userId);

        res.status(201).json({
            hours50, hours75, hours100,
            hourlyRate: req.user.hourlyRate,
            value,
            newBalance,
        });
    } catch (e) {
        console.error('Erro ao passar horas para o banco:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};
