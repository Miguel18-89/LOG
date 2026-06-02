const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('../modules/email');

const vacationInclude = {
    employee: { select: { id: true, fullName: true, workEmail: true } },
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

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()))
            return res.status(400).json({ error: 'Datas inválidas.' });
        if (end < start)
            return res.status(400).json({ error: 'A data de fim não pode ser anterior à de início.' });
        const maxFuture = new Date();
        maxFuture.setFullYear(maxFuture.getFullYear() + 2);
        if (start > maxFuture)
            return res.status(400).json({ error: 'O período de férias não pode ser superior a 2 anos no futuro.' });
        if (notes && notes.length > 500)
            return res.status(400).json({ error: 'As notas não podem exceder 500 caracteres.' });

        // Role 0 can only create requests for themselves
        if (req.user.role < 1) {
            const ownEmployee = await prisma.employee.findFirst({ where: { workEmail: req.user.email } });
            if (!ownEmployee)
                return res.status(403).json({ error: 'O seu utilizador não está associado a nenhum colaborador. Contacte o administrador.' });
            if (ownEmployee.id !== employee_id)
                return res.status(403).json({ error: 'Apenas pode criar pedidos de férias para si mesmo.' });
        }

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

        // Notify all managers/admins
        const fmt = d => new Date(d).toLocaleDateString('pt-PT');
        const frontendUrl = process.env.FRONTEND_URL || 'http://213.199.58.233:8080';
        const admins = await prisma.user.findMany({ where: { role: { gte: 1 }, is_active: true, approved: true } });
        for (const admin of admins) {
            sendEmail(
                admin.email,
                `Novo Pedido de Férias – ${vacation.employee.fullName}`,
                `Olá ${admin.name},\n\nFoi submetido um novo pedido de férias:\n\nColaborador: ${vacation.employee.fullName}\nPeríodo: ${fmt(vacation.startDate)} a ${fmt(vacation.endDate)}${vacation.notes ? `\nNotas: ${vacation.notes}` : ''}\n\nPode aprovar ou rejeitar em:\n${frontendUrl}/EMG/Ferias\n\nCom os melhores cumprimentos,\nEMG`
            ).catch(err => console.error('Erro ao notificar admin:', err));
        }

        res.status(201).json(vacation);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        if (!['aprovado', 'rejeitado', 'pendente', 'cancelado'].includes(status))
            return res.status(400).json({ error: 'Estado inválido.' });

        const existing = await prisma.vacationRequest.findUnique({
            where: { id: req.params.id },
            include: vacationInclude,
        });
        if (!existing) return res.status(404).json({ error: 'Pedido não encontrado.' });

        if (status === 'cancelado') {
            if (existing.created_by !== req.user.id && req.user.role < 1)
                return res.status(403).json({ error: 'Não tem permissão para cancelar este pedido.' });
        } else {
            if (req.user.role < 1)
                return res.status(403).json({ error: 'Sem permissão para aprovar férias.' });
        }

        const wasApproved = existing.status === 'aprovado';
        const fmt = d => new Date(d).toLocaleDateString('pt-PT');

        const vacation = await prisma.vacationRequest.update({
            where: { id: req.params.id },
            data: {
                status,
                rejectionReason: status === 'rejeitado' ? (rejectionReason || null) : null,
                approved_by: (status === 'aprovado' || status === 'rejeitado') ? req.user.id : null,
                approvedAt: (status === 'aprovado' || status === 'rejeitado') ? new Date() : null,
            },
            include: vacationInclude,
        });

        if (status === 'aprovado' && vacation.employee?.workEmail) {
            sendEmail(
                vacation.employee.workEmail,
                'Férias Aprovadas – EMG',
                `Olá ${vacation.employee.fullName},\n\nO seu pedido de férias de ${fmt(vacation.startDate)} a ${fmt(vacation.endDate)} foi aprovado.\n\nCom os melhores cumprimentos,\nEMG`
            ).catch(err => console.error('Erro ao enviar email de aprovação:', err));
        }

        if (status === 'rejeitado' && vacation.employee?.workEmail) {
            const reasonText = rejectionReason ? `\n\nMotivo: ${rejectionReason}` : '';
            sendEmail(
                vacation.employee.workEmail,
                'Pedido de Férias Rejeitado – EMG',
                `Olá ${vacation.employee.fullName},\n\nO seu pedido de férias de ${fmt(vacation.startDate)} a ${fmt(vacation.endDate)} foi rejeitado.${reasonText}\n\nPara mais informações, contacte o seu responsável.\n\nCom os melhores cumprimentos,\nEMG`
            ).catch(err => console.error('Erro ao enviar email de rejeição:', err));
        }

        if (status === 'cancelado' && wasApproved) {
            const admins = await prisma.user.findMany({ where: { role: { gte: 1 }, is_active: true, approved: true } });
            const frontendUrl = process.env.FRONTEND_URL || 'http://213.199.58.233:8080';
            for (const admin of admins) {
                sendEmail(
                    admin.email,
                    `Férias Canceladas – ${vacation.employee.fullName}`,
                    `Olá ${admin.name},\n\n${vacation.employee.fullName} cancelou as férias aprovadas de ${fmt(vacation.startDate)} a ${fmt(vacation.endDate)}.\n\nConsulte a gestão de férias em:\n${frontendUrl}/EMG/Ferias\n\nCom os melhores cumprimentos,\nEMG`
                ).catch(err => console.error('Erro ao notificar admin:', err));
            }
        }

        res.json(vacation);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteVacation = async (req, res) => {
    try {
        if (req.user.role < 1)
            return res.status(403).json({ error: 'Sem permissão para eliminar pedidos de férias.' });
        const exists = await prisma.vacationRequest.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ error: 'Pedido não encontrado.' });
        await prisma.vacationRequest.delete({ where: { id: req.params.id } });
        res.json({ message: 'Pedido eliminado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};
