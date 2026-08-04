const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();
const { createOvertimeSchema, updateOvertimeSchema, vacationPeriodSchema, MAX_VACATION_BUSINESS_DAYS, RECORD_TYPES } = require('../schemas/overtimeSchema.js');
const { hashPin } = require('../utils/pinHash');

// Feriados nacionais portugueses de data fixa (MM-DD) — mesma lista usada no frontend
// (EMGHorasExtra.jsx). Feriados móveis devem ser marcados manualmente com recordType 'feriado'.
const FIXED_HOLIDAYS_MMDD = [
    '01-01', '04-25', '05-01', '06-10', '08-15', '10-05', '11-01', '12-01', '12-08', '12-25',
];

function pad2(n) {
    return String(n).padStart(2, '0');
}

// Espelha getMissingBusinessDays do frontend (EMGHorasExtra.jsx), para o servidor ser a
// autoridade final antes de enviar o email — o cliente pode ter estado desatualizado ou ser
// contornado, mas o backend não deve permitir enviar um mês incompleto.
function getMissingBusinessDays(records, year, month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const isFutureMonth = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1);
    if (isFutureMonth) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const presentDates = new Set(records.map(r => {
        const d = new Date(r.date);
        return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }));

    const missing = [];
    for (let day = 1; day <= lastDay; day++) {
        const dow = new Date(year, month - 1, day).getDay();
        if (dow === 0 || dow === 6) continue;
        const mmdd = `${pad2(month)}-${pad2(day)}`;
        if (FIXED_HOLIDAYS_MMDD.includes(mmdd)) continue;
        const dateStr = `${year}-${mmdd}`;
        if (!presentDates.has(dateStr)) missing.push(dateStr);
    }
    return missing;
}

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

function needsClientObra(nightType) {
    return nightType === 'trabalhada' || nightType === 'fora_de_casa';
}

function calcOvertimeHours(date, entryTime, exitTime, isHoliday, dinner, weekendLunch, exitIsHoliday = false) {
    const d = new Date(date);
    d.setUTCHours(12, 0, 0, 0);
    const dayOfWeek = d.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const [eH, eM] = entryTime.split(':').map(Number);
    const [xH, xM] = exitTime.split(':').map(Number);
    let totalMin = (xH * 60 + xM) - (eH * 60 + eM);
    const isOvernight = totalMin <= 0;
    if (isOvernight) totalMin += 24 * 60;

    // Whole shift on weekend/holiday — all hours at 100%
    if (isWeekend || isHoliday) {
        let workMin = totalMin;
        if (weekendLunch) workMin -= 60;
        if (dinner) workMin -= 60;
        if (workMin <= 0) return { hours50: 0, hours75: 0, hours100: 0 };
        return { hours50: 0, hours75: 0, hours100: Math.round(workMin / 60 * 100) / 100 };
    }

    // Auto-detect if exit falls on a weekend (next calendar day)
    let exitOnWeekend = false;
    if (isOvernight) {
        const exitDate = new Date(d);
        exitDate.setUTCDate(exitDate.getUTCDate() + 1);
        const exitDay = exitDate.getUTCDay();
        exitOnWeekend = exitDay === 0 || exitDay === 6;
    }

    // Overnight into weekend/holiday: split at midnight
    // before midnight → weekday rules (50%/75%), after midnight → 100%
    if (isOvernight && (exitOnWeekend || exitIsHoliday)) {
        const minBefore = 24 * 60 - (eH * 60 + eM);
        const minAfter = xH * 60 + xM;

        let overtimeBefore = minBefore - 10 * 60;
        if (dinner) overtimeBefore -= 60;

        let hours50 = 0, hours75 = 0;
        if (overtimeBefore > 0) {
            const ot = overtimeBefore / 60;
            hours50 = Math.round(Math.min(ot, 1) * 100) / 100;
            hours75 = Math.round(Math.max(0, ot - 1) * 100) / 100;
        }

        let afterMin = minAfter;
        if (weekendLunch) afterMin -= 60;
        const hours100 = Math.round(Math.max(0, afterMin) / 60 * 100) / 100;

        return { hours50, hours75, hours100 };
    }

    // Regular weekday overtime
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

        const { date, recordType, entryTime, exitTime, dinner, weekendLunch, isHoliday, exitIsHoliday, nightType, client, obra } = parseResult.data;
        const userId = req.user.id;

        const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999);
        const existing = await prisma.overtimeRecord.findFirst({
            where: { user_id: userId, date: { gte: dayStart, lte: dayEnd } },
        });
        if (existing) return res.status(409).json({ error: 'Já existe um registo para esta data' });

        let data;
        if (recordType === 'trabalho') {
            const { hours50, hours75, hours100 } = calcOvertimeHours(date, entryTime, exitTime, isHoliday, dinner, weekendLunch, exitIsHoliday);
            const finalNightType = nightType || detectNightType(exitTime) || null;
            const hasClientObra = needsClientObra(finalNightType);
            data = {
                date, recordType, entryTime, exitTime, dinner, weekendLunch,
                hours50, hours75, hours100, nightType: finalNightType,
                client: hasClientObra ? (client || null) : null,
                obra: hasClientObra ? (obra || null) : null,
            };
        } else {
            data = {
                date, recordType, entryTime: null, exitTime: null, dinner: false, weekendLunch: false,
                hours50: 0, hours75: 0, hours100: 0, nightType: null, client: null, obra: null,
            };
        }

        const newOvertime = await prisma.overtimeRecord.create({
            data: { ...data, createdBy: { connect: { id: userId } } },
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

        const recordType = parseResult.data.recordType ?? current.recordType ?? 'trabalho';

        let data;
        if (recordType === 'trabalho') {
            const merged = {
                date: parseResult.data.date ?? current.date,
                entryTime: parseResult.data.entryTime ?? current.entryTime,
                exitTime: parseResult.data.exitTime ?? current.exitTime,
                dinner: parseResult.data.dinner ?? current.dinner,
                weekendLunch: parseResult.data.weekendLunch ?? current.weekendLunch,
                isHoliday: parseResult.data.isHoliday ?? false,
                exitIsHoliday: parseResult.data.exitIsHoliday ?? false,
            };

            if (!merged.entryTime || !merged.exitTime) {
                return res.status(400).json({ error: 'Hora de entrada e hora de saída são obrigatórias para um registo de trabalho' });
            }

            const { hours50, hours75, hours100 } = calcOvertimeHours(
                merged.date, merged.entryTime, merged.exitTime,
                merged.isHoliday, merged.dinner, merged.weekendLunch, merged.exitIsHoliday
            );

            const finalNightType = parseResult.data.nightType || detectNightType(merged.exitTime) || current.nightType || null;
            const hasClientObra = needsClientObra(finalNightType);
            const mergedClient = parseResult.data.client ?? current.client ?? null;
            const mergedObra = parseResult.data.obra ?? current.obra ?? null;

            if (hasClientObra && (!mergedClient || !mergedObra)) {
                return res.status(400).json({ error: 'Cliente e obra/local são obrigatórios para noites trabalhadas ou fora de casa' });
            }

            data = {
                recordType,
                date: merged.date,
                entryTime: merged.entryTime,
                exitTime: merged.exitTime,
                dinner: merged.dinner,
                weekendLunch: merged.weekendLunch,
                hours50, hours75, hours100,
                nightType: finalNightType,
                client: hasClientObra ? mergedClient : null,
                obra: hasClientObra ? mergedObra : null,
            };
        } else {
            data = {
                recordType,
                date: parseResult.data.date ?? current.date,
                entryTime: null, exitTime: null, dinner: false, weekendLunch: false,
                hours50: 0, hours75: 0, hours100: 0, nightType: null, client: null, obra: null,
            };
        }

        const updatedRecord = await prisma.overtimeRecord.update({ where: { id }, data });

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

exports.createVacationPeriod = async (req, res) => {
    try {
        const parseResult = vacationPeriodSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.format() });
        }

        const { startDate, endDate } = parseResult.data;
        const userId = req.user.id;

        const businessDays = [];
        const cursor = new Date(startDate);
        cursor.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);
        while (cursor <= end) {
            const day = cursor.getUTCDay();
            if (day !== 0 && day !== 6) businessDays.push(new Date(cursor));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        if (businessDays.length === 0) {
            return res.status(400).json({ error: 'O período não contém dias úteis' });
        }
        if (businessDays.length > MAX_VACATION_BUSINESS_DAYS) {
            return res.status(400).json({
                error: `O período não pode exceder ${MAX_VACATION_BUSINESS_DAYS} dias úteis. Submeta vários períodos separados.`,
            });
        }

        const created = [];
        const skipped = [];
        for (const day of businessDays) {
            const dayStart = new Date(day); dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(day); dayEnd.setUTCHours(23, 59, 59, 999);
            const dateStr = day.toISOString().split('T')[0];
            const existing = await prisma.overtimeRecord.findFirst({
                where: { user_id: userId, date: { gte: dayStart, lte: dayEnd } },
            });
            if (existing) {
                skipped.push(dateStr);
                continue;
            }
            await prisma.overtimeRecord.create({
                data: {
                    date: day,
                    recordType: 'ferias',
                    hours50: 0,
                    hours75: 0,
                    hours100: 0,
                    createdBy: { connect: { id: userId } },
                },
            });
            created.push(dateStr);
        }

        res.status(201).json({ message: 'Período de férias processado', created: created.length, skipped });
    } catch (e) {
        console.error('Erro ao criar período de férias:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.publicCreateOvertime = async (req, res) => {
    try {
        const { pin, date, entryTime, exitTime, dinner, weekendLunch, isHoliday, exitIsHoliday, nightType, client, obra } = req.body;
        const recordType = RECORD_TYPES.includes(req.body.recordType) ? req.body.recordType : 'trabalho';

        if (!pin) return res.status(400).json({ error: 'PIN em falta' });
        if (!/^\d{4,8}$/.test(String(pin))) return res.status(400).json({ error: 'PIN inválido' });
        if (!date) return res.status(400).json({ error: 'Data é obrigatória' });
        if (recordType === 'trabalho' && (!entryTime || !exitTime)) {
            return res.status(400).json({ error: 'Hora de entrada e hora de saída são obrigatórios' });
        }

        const user = await prisma.user.findFirst({ where: { pin: hashPin(String(pin)) } });
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

        if (recordType !== 'trabalho') {
            await prisma.overtimeRecord.create({
                data: {
                    date: parsedDate,
                    recordType,
                    hours50: 0,
                    hours75: 0,
                    hours100: 0,
                    createdBy: { connect: { id: user.id } },
                },
            });
            return res.status(201).json({ message: 'Registo gravado com sucesso' });
        }

        const finalNightType = nightType || detectNightType(exitTime) || null;
        if (needsClientObra(finalNightType) && (!client || !obra)) {
            return res.status(400).json({ error: 'Cliente e obra/local são obrigatórios para noites trabalhadas ou fora de casa' });
        }

        const { hours50, hours75, hours100 } = calcOvertimeHours(parsedDate, entryTime, exitTime, isHoliday || false, dinner || false, weekendLunch || false, exitIsHoliday || false);

        await prisma.overtimeRecord.create({
            data: {
                date: parsedDate,
                recordType: 'trabalho',
                entryTime,
                exitTime,
                dinner: dinner || false,
                weekendLunch: weekendLunch || false,
                hours50,
                hours75,
                hours100,
                nightType: finalNightType,
                client: needsClientObra(finalNightType) ? (client || null) : null,
                obra: needsClientObra(finalNightType) ? (obra || null) : null,
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
        const { pdf, pdfAjudas, month, year, monthName, comment } = req.body;
        const user = req.user;

        if (!pdf) return res.status(400).json({ error: 'PDF em falta' });
        if (!month || !year) return res.status(400).json({ error: 'Mês/ano em falta' });

        const y = parseInt(year);
        const m = parseInt(month);
        const monthRecords = await prisma.overtimeRecord.findMany({
            where: { user_id: user.id, date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } },
        });
        const missing = getMissingBusinessDays(monthRecords, y, m);
        if (missing.length > 0) {
            return res.status(400).json({
                error: `Existem ${missing.length} dia(s) útil(eis) de ${monthName} ${year} sem registo`,
                missing,
            });
        }

        const recipients = [...new Set([process.env.OVERTIME_RECIPIENT_EMAIL, user.email].filter(Boolean))];

        const commentBlock = comment
            ? `<p><strong>Comentário:</strong><br/>${comment.replace(/\n/g, '<br/>')}</p>`
            : '';

        const attachments = [{
            filename: `horas-extra-${user.name.replace(/\s+/g, '-')}-${monthName}-${year}.pdf`,
            content: Buffer.from(pdf, 'base64'),
            contentType: 'application/pdf',
        }];

        if (pdfAjudas) {
            attachments.push({
                filename: `mapa-ajudas-custo-${user.name.replace(/\s+/g, '-')}-${monthName}-${year}.pdf`,
                content: Buffer.from(pdfAjudas, 'base64'),
                contentType: 'application/pdf',
            });
        }

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"LOG" <${process.env.SMTP_USER}>`,
            to: recipients.join(', '),
            subject: `Horas Extra — ${monthName} ${year} — ${user.name}`,
            html: `
                <p>Olá,</p>
                <p>Em anexo seguem as horas extra de <strong>${user.name}</strong> referentes a <strong>${monthName} ${year}</strong>${pdfAjudas ? ', bem como o mapa de ajudas de custo do mesmo período' : ''}.</p>
                ${commentBlock}
                <p>Cumprimentos,<br/>LOG</p>
            `,
            attachments,
        });

        res.status(200).json({ message: 'Email enviado com sucesso' });
    } catch (e) {
        console.error('Erro ao enviar email de horas extra:', e);
        res.status(500).json({ error: 'Erro ao enviar email' });
    }
};
