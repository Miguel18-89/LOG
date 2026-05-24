const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();
const { createOvertimeSchema, updateOvertimeSchema } = require('../schemas/overtimeSchema.js');
const { hashPin, isValidPinHash } = require('../utils/pinHash');

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
}

function detectNightType(exitTime) {
    const [h, m] = exitTime.split(':').map(Number);
    const totalMin = h * 60 + m;
    if (totalMin >= 2 * 60 && totalMin < 9 * 60) return 'trabalhada';
    return null;
}

function calcOvertimeHours(date, entryTime, exitTime, isHoliday, dinner, weekendLunch) {
    const d = new Date(date);
    d.setUTCHours(12, 0, 0, 0);
    const dayOfWeek = d.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const [eH, eM] = entryTime.split(':').map(Number);
    const [xH, xM] = exitTime.split(':').map(Number);
    let totalMin = (xH * 60 + xM) - (eH * 60 + eM);
    if (totalMin <= 0) totalMin += 24 * 60;

    if (isWeekend || isHoliday) {
        let workMin = totalMin;
        if (weekendLunch) workMin -= 60;
        if (dinner) workMin -= 60;
        if (workMin <= 0) return { hours50: 0, hours75: 0, hours100: 0 };
        return { hours50: 0, hours75: 0, hours100: Math.round(workMin / 60 * 100) / 100 };
    }

    let overtimeMin = totalMin - 10 * 60;
    if (dinner) overtimeMin -= 60;
    if (overtimeMin <= 0) return { hours50: 0, hours75: 0, hours100: 0 };

    const overtime = overtimeMin / 60;
    return {
        hours50: Math.round(Math.min(overtime, 1) * 100) / 100,
        hours75: Math.round(Math.max(0, overtime - 1) * 100) / 100,
        hours100: 0,
    };
}

exports.createOvertime = async (req, res) => {
    try {
        const parseResult = createOvertimeSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }

        const { date, entryTime, exitTime, dinner, weekendLunch, isHoliday, nightType } = parseResult.data;
        const userId = req.user.id;

        const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999);
        const existing = await prisma.overtimeRecord.findFirst({
            where: { user_id: userId, date: { gte: dayStart, lte: dayEnd } },
        });
        if (existing) return res.status(409).json({ error: 'Já existe um registo para esta data' });

        const { hours50, hours75, hours100 } = calcOvertimeHours(date, entryTime, exitTime, isHoliday, dinner, weekendLunch);
        const finalNightType = nightType || detectNightType(exitTime) || null;

        const newOvertime = await prisma.overtimeRecord.create({
            data: {
                date,
                entryTime,
                exitTime,
                dinner,
                weekendLunch,
                hours50,
                hours75,
                hours100,
                nightType: finalNightType,
                createdBy: { connect: { id: userId } },
            },
        });

        res.status(201).json({ message: 'Registo de horas extra criado com sucesso', overtime: newOvertime });
    } catch (e) {
        console.error('Erro ao criar horas extra:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.getAllOvertime = async (req, res) => {
    try {
        const { year, month } = req.query;

        const where = { user_id: req.user.id };
        if (year && month) {
            const y = parseInt(year);
            const m = parseInt(month);
            where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
        }

        const records = await prisma.overtimeRecord.findMany({
            where,
            include: { createdBy: { select: { id: true, name: true, email: true } } },
            orderBy: { date: 'asc' },
        });

        res.status(200).json(records);
    } catch (e) {
        console.error('Erro ao obter horas extra:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.getOvertimeById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await prisma.overtimeRecord.findUnique({
            where: { id },
            include: { createdBy: { select: { id: true, name: true, email: true } } },
        });
        if (!record) return res.status(404).json({ error: 'Registo não encontrado' });
        res.status(200).json(record);
    } catch (e) {
        console.error('Erro ao obter registo:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.updateOvertime = async (req, res) => {
    try {
        const { id } = req.params;

        const parseResult = updateOvertimeSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }

        const current = await prisma.overtimeRecord.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Registo não encontrado' });

        if (parseResult.data.date) {
            const newDate = parseResult.data.date;
            const dayStart = new Date(newDate); dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(newDate); dayEnd.setUTCHours(23, 59, 59, 999);
            const conflict = await prisma.overtimeRecord.findFirst({
                where: { user_id: current.user_id, date: { gte: dayStart, lte: dayEnd }, NOT: { id } },
            });
            if (conflict) return res.status(409).json({ error: 'Já existe um registo para esta data' });
        }

        const merged = {
            date: parseResult.data.date ?? current.date,
            entryTime: parseResult.data.entryTime ?? current.entryTime,
            exitTime: parseResult.data.exitTime ?? current.exitTime,
            dinner: parseResult.data.dinner ?? current.dinner,
            weekendLunch: parseResult.data.weekendLunch ?? current.weekendLunch,
            isHoliday: parseResult.data.isHoliday ?? false,
        };

        const { hours50, hours75, hours100 } = calcOvertimeHours(
            merged.date, merged.entryTime, merged.exitTime,
            merged.isHoliday, merged.dinner, merged.weekendLunch
        );

        const { isHoliday: _ignored, nightType: _nt, ...dataWithoutHoliday } = parseResult.data;
        const finalNightType = parseResult.data.nightType || detectNightType(merged.exitTime) || current.nightType || null;

        const updatedRecord = await prisma.overtimeRecord.update({
            where: { id },
            data: { ...dataWithoutHoliday, hours50, hours75, hours100, nightType: finalNightType },
        });

        res.status(200).json({ message: 'Registo actualizado com sucesso', overtime: updatedRecord });
    } catch (e) {
        console.error('Erro ao actualizar horas extra:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.deleteOvertime = async (req, res) => {
    try {
        const { id } = req.params;
        const recordExists = await prisma.overtimeRecord.findUnique({ where: { id } });
        if (!recordExists) return res.status(404).json({ error: 'Registo não encontrado' });
        await prisma.overtimeRecord.delete({ where: { id } });
        res.status(200).json({ message: 'Registo eliminado com sucesso' });
    } catch (e) {
        console.error('Erro ao eliminar horas extra:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.publicCreateOvertime = async (req, res) => {
    try {
        const { pin, date, entryTime, exitTime, dinner, weekendLunch, isHoliday, nightType } = req.body;

        if (!pin) return res.status(400).json({ error: 'PIN em falta' });
        if (!isValidPinHash(String(pin))) return res.status(400).json({ error: 'Formato de PIN inválido' });
        if (!date || !entryTime || !exitTime) return res.status(400).json({ error: 'Data, hora de entrada e hora de saída são obrigatórios' });

        const pinHmac = hashPin(String(pin));
        const user = await prisma.user.findFirst({ where: { pin: pinHmac } });
        if (!user) return res.status(401).json({ error: 'PIN inválido' });

        const parsedDate = new Date(date + 'T12:00:00Z');
        const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);
        if (parsedDate > todayEnd) return res.status(400).json({ error: 'Não é permitido registar datas futuras' });

        const dayStart = new Date(date + 'T00:00:00Z');
        const dayEnd = new Date(date + 'T23:59:59Z');
        const existing = await prisma.overtimeRecord.findFirst({
            where: { user_id: user.id, date: { gte: dayStart, lte: dayEnd } },
        });
        if (existing) return res.status(409).json({ error: 'Já existe um registo para esta data' });

        const { hours50, hours75, hours100 } = calcOvertimeHours(parsedDate, entryTime, exitTime, isHoliday || false, dinner || false, weekendLunch || false);
        const finalNightType = nightType || detectNightType(exitTime) || null;

        await prisma.overtimeRecord.create({
            data: {
                date: parsedDate,
                entryTime,
                exitTime,
                dinner: dinner || false,
                weekendLunch: weekendLunch || false,
                hours50,
                hours75,
                hours100,
                nightType: finalNightType,
                createdBy: { connect: { id: user.id } },
            },
        });

        res.status(201).json({ message: 'Registo gravado com sucesso' });
    } catch (e) {
        console.error('Erro ao criar registo público:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.sendOvertimeEmail = async (req, res) => {
    try {
        const { pdf, month, year, monthName, comment } = req.body;
        const user = req.user;

        if (!pdf) return res.status(400).json({ error: 'PDF em falta' });

        const recipients = [...new Set([process.env.OVERTIME_RECIPIENT_EMAIL, user.email].filter(Boolean))];

        const commentBlock = comment
            ? `<p><strong>Comentário:</strong><br/>${comment.replace(/\n/g, '<br/>')}</p>`
            : '';

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"LOG" <${process.env.SMTP_USER}>`,
            to: recipients.join(', '),
            subject: `Horas Extra — ${monthName} ${year} — ${user.name}`,
            html: `
                <p>Olá,</p>
                <p>Em anexo seguem as horas extra de <strong>${user.name}</strong> referentes a <strong>${monthName} ${year}</strong>.</p>
                ${commentBlock}
                <p>Cumprimentos,<br/>LOG</p>
            `,
            attachments: [{
                filename: `horas-extra-${user.name.replace(/\s+/g, '-')}-${monthName}-${year}.pdf`,
                content: Buffer.from(pdf, 'base64'),
                contentType: 'application/pdf',
            }],
        });

        res.status(200).json({ message: 'Email enviado com sucesso' });
    } catch (e) {
        console.error('Erro ao enviar email de horas extra:', e);
        res.status(500).json({ error: 'Erro ao enviar email' });
    }
};
