const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
}

function fmt(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-PT');
}

function daysUntil(date) {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function daysSince(date) {
    if (!date) return 0;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
}

function statusLabel(status) {
    const labels = {
        no_cliente: 'No cliente',
        em_armazem: 'Em armazém',
        em_reparacao: 'Em reparação',
        reparado_armazem: 'Reparado (armazém)',
        entregue: 'Entregue',
    };
    return labels[status] || status;
}

function buildHtml(vehicles, repairs, employees, now) {
    const noItems = '<p style="color:#888;font-style:italic;margin:8px 0">Sem alertas esta semana.</p>';

    const section = (title, color, content) => `
        <h2 style="color:${color};border-bottom:2px solid ${color};padding-bottom:6px;margin-top:28px;font-size:16px">${title}</h2>
        ${content}
    `;

    const rowBg = (i) => i % 2 === 0 ? '#fff' : '#fff8e1';
    const expired = (date) => date && new Date(date) <= now;

    const vehiclesHtml = vehicles.length === 0 ? noItems : `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f57c00;color:#fff">
                    <th style="padding:8px;text-align:left">Matrícula</th>
                    <th style="padding:8px;text-align:left">Viatura</th>
                    <th style="padding:8px;text-align:left">Próxima Inspeção</th>
                    <th style="padding:8px;text-align:left">Validade Seguro</th>
                </tr>
            </thead>
            <tbody>
                ${vehicles.map((v, i) => `
                <tr style="background:${rowBg(i)}">
                    <td style="padding:7px 8px;font-weight:bold">${v.plate}</td>
                    <td style="padding:7px 8px">${v.brand} ${v.model}</td>
                    <td style="padding:7px 8px;color:${expired(v.nextInspectionDate) ? '#c62828' : '#e65100'};font-weight:${v.nextInspectionDate ? 'bold' : 'normal'}">
                        ${v.nextInspectionDate ? `${fmt(v.nextInspectionDate)} (${daysUntil(v.nextInspectionDate)}d)` : '—'}
                    </td>
                    <td style="padding:7px 8px;color:${expired(v.insuranceExpiryDate) ? '#c62828' : '#e65100'};font-weight:${v.insuranceExpiryDate ? 'bold' : 'normal'}">
                        ${v.insuranceExpiryDate ? `${fmt(v.insuranceExpiryDate)} (${daysUntil(v.insuranceExpiryDate)}d)` : '—'}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    const repairsHtml = repairs.length === 0 ? noItems : `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f57c00;color:#fff">
                    <th style="padding:8px;text-align:left">Nº RMA</th>
                    <th style="padding:8px;text-align:left">Equipamento</th>
                    <th style="padding:8px;text-align:left">Cliente</th>
                    <th style="padding:8px;text-align:left">Estado</th>
                    <th style="padding:8px;text-align:left">Aberto há</th>
                </tr>
            </thead>
            <tbody>
                ${repairs.map((r, i) => `
                <tr style="background:${rowBg(i)}">
                    <td style="padding:7px 8px;font-weight:bold">#${r.rmaNumber}</td>
                    <td style="padding:7px 8px">${r.brand} ${r.model}</td>
                    <td style="padding:7px 8px">${r.client}</td>
                    <td style="padding:7px 8px">${statusLabel(r.status)}</td>
                    <td style="padding:7px 8px;color:#c62828;font-weight:bold">${daysSince(r.openDate)} dias</td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    const employeesHtml = employees.length === 0 ? noItems : `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f57c00;color:#fff">
                    <th style="padding:8px;text-align:left">Colaborador</th>
                    <th style="padding:8px;text-align:left">Validade da Ficha</th>
                    <th style="padding:8px;text-align:left">Dias restantes</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map((e, i) => {
                    const days = daysUntil(e.medicalFitnessDate);
                    return `
                <tr style="background:${rowBg(i)}">
                    <td style="padding:7px 8px;font-weight:bold">${e.fullName}</td>
                    <td style="padding:7px 8px;color:${days <= 0 ? '#c62828' : '#1565c0'};font-weight:bold">${fmt(e.medicalFitnessDate)}</td>
                    <td style="padding:7px 8px;font-weight:bold;color:${days <= 0 ? '#c62828' : '#1565c0'}">${days <= 0 ? `Expirada há ${Math.abs(days)}d` : `${days} dias`}</td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:820px;margin:0 auto;padding:20px">
    <div style="background:#f57c00;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Relatório Semanal — LOG</h1>
        <p style="color:#ffe0b2;margin:6px 0 0;font-size:13px">
            ${now.toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
    </div>
    <div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        ${section('Viaturas — Inspeção / Seguro a expirar em menos de 1 mês', '#e65100', vehiclesHtml)}
        ${section('Reparações (RMA) abertas há mais de 15 dias', '#c62828', repairsHtml)}
        ${section('Fichas de Aptidão Médica a expirar em menos de 1 mês', '#1565c0', employeesHtml)}
    </div>
    <p style="color:#bbb;font-size:11px;margin-top:16px;text-align:center">LOG — Relatório automático de segunda-feira</p>
</body></html>`;
}

async function sendMondayReport() {
    const now = new Date();
    const oneMonthAhead = new Date(now);
    oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const [vehicles, repairs, employees, admins] = await Promise.all([
        prisma.vehicle.findMany({
            where: {
                OR: [
                    { nextInspectionDate: { lte: oneMonthAhead } },
                    { insuranceExpiryDate: { lte: oneMonthAhead } },
                ],
            },
            orderBy: { plate: 'asc' },
        }),
        prisma.rMA.findMany({
            where: {
                openDate: { lte: fifteenDaysAgo },
                status: { notIn: ['entregue', 'reparado_armazem'] },
            },
            orderBy: { openDate: 'asc' },
        }),
        prisma.employee.findMany({
            where: { medicalFitnessDate: { not: null, lte: oneMonthAhead } },
            orderBy: { fullName: 'asc' },
        }),
        prisma.user.findMany({
            where: { role: 2, is_active: true },
            select: { email: true },
        }),
    ]);

    if (admins.length === 0) {
        console.log('[MondayReport] No admin users found, skipping.');
        return;
    }

    if (vehicles.length === 0 && repairs.length === 0 && employees.length === 0) {
        console.log('[MondayReport] Nothing to report this week.');
        return;
    }

    const html = buildHtml(vehicles, repairs, employees, now);
    const transporter = createTransporter();

    await transporter.sendMail({
        from: `"LOG" <${process.env.SMTP_USER}>`,
        to: admins.map(a => a.email).join(', '),
        subject: `Relatório Semanal LOG — ${fmt(now)}`,
        html,
    });

    console.log(`[MondayReport] Sent to: ${admins.map(a => a.email).join(', ')}`);
}

function startMondayReportJob() {
    // Every Monday at 08:00 Lisbon time
    cron.schedule('0 8 * * 1', async () => {
        console.log('[MondayReport] Running weekly report...');
        try {
            await sendMondayReport();
        } catch (e) {
            console.error('[MondayReport] Error sending report:', e);
        }
    }, { timezone: 'Europe/Lisbon' });

    console.log('[MondayReport] Scheduled — every Monday at 08:00 (Europe/Lisbon)');
}

module.exports = { startMondayReportJob, sendMondayReport };
