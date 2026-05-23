const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const vacationInclude = {
    employee: { select: { id: true, fullName: true } },
    createdBy: { select: { id: true, name: true } },
    approvedBy: { select: { id: true, name: true } },
};

exports.getAllVacations = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);

        const vacations = await prisma.vacationRequest.findMany({
            where: {
                OR: [
                    { startDate: { gte: start, lte: end } },
                    { endDate: { gte: start, lte: end } },
                    { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
                ],
            },
            include: vacationInclude,
            orderBy: { startDate: 'asc' },
        });

        res.json(vacations);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.createVacation = async (req, res) => {
    try {
        const { employee_id, startDate, endDate, notes } = req.body;
        if (!employee_id || !startDate || !endDate)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
        if (new Date(endDate) < new Date(startDate))
            return res.status(400).json({ error: 'A data de fim não pode ser anterior à de início.' });

        const vacation = await prisma.vacationRequest.create({
            data: {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                notes: notes || null,
                employee: { connect: { id: employee_id } },
                createdBy: { connect: { id: req.user.id } },
            },
            include: vacationInclude,
        });
        res.status(201).json(vacation);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['aprovado', 'rejeitado', 'pendente'].includes(status))
            return res.status(400).json({ error: 'Estado inválido.' });
        if (req.user.role < 1)
            return res.status(403).json({ error: 'Sem permissão para aprovar férias.' });

        const vacation = await prisma.vacationRequest.update({
            where: { id: req.params.id },
            data: {
                status,
                approved_by: status !== 'pendente' ? req.user.id : null,
                approvedAt: status !== 'pendente' ? new Date() : null,
            },
            include: vacationInclude,
        });
        res.json(vacation);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteVacation = async (req, res) => {
    try {
        const exists = await prisma.vacationRequest.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ error: 'Pedido não encontrado.' });
        await prisma.vacationRequest.delete({ where: { id: req.params.id } });
        res.json({ message: 'Pedido eliminado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};
