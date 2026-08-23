const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs/promises');
const prisma = new PrismaClient();

const {
    TYPE_VALID, STATUS_VALID, DOC_KINDS,
    workOrderSchema, updateWorkOrderSchema, signatureSchema, sendReportSchema,
} = require('../schemas/workOrderSchema.js');

const TYPE_LABELS = {
    instalacao: 'Instalação',
    manutencao: 'Manutenção',
    reparacao: 'Reparação',
};

const workOrderInclude = {
    createdBy: { select: { id: true, name: true } },
    technicians: { select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } },
    documents: {
        select: { id: true, kind: true, originalName: true, uploadedAt: true },
        orderBy: { uploadedAt: 'asc' },
    },
};

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
}

// O multer guarda com o nome original em latin1; o resto da app corrige da mesma forma.
function fixEncoding(str) {
    return Buffer.from(str, 'latin1').toString('utf8');
}

function zodError(res, parseResult) {
    return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Dados inválidos',
        details: parseResult.error.format(),
    });
}

/* ── Obras ── */

exports.createWorkOrder = async (req, res) => {
    try {
        const parsed = workOrderSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const { technicianIds, notes, ...data } = parsed.data;

        const workOrder = await prisma.workOrder.create({
            data: {
                ...data,
                notes: notes || null,
                technicians: { connect: technicianIds.map(id => ({ id })) },
                createdBy: { connect: { id: req.user.id } },
            },
            include: workOrderInclude,
        });
        res.status(201).json(workOrder);
    } catch (e) {
        console.error('Erro ao criar obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllWorkOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const { client, type, status, from, to } = req.query;

        const where = {};
        if (client) where.client = { contains: client, mode: 'insensitive' };
        if (type && TYPE_VALID.includes(type)) where.type = type;
        if (status && STATUS_VALID.includes(status)) where.status = status;
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [data, total] = await Promise.all([
            prisma.workOrder.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { date: 'desc' },
                include: workOrderInclude,
            }),
            prisma.workOrder.count({ where }),
        ]);

        res.status(200).json({ data, total });
    } catch (e) {
        console.error('Erro ao listar obras:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getWorkOrderById = async (req, res) => {
    try {
        const workOrder = await prisma.workOrder.findUnique({
            where: { id: req.params.id },
            include: workOrderInclude,
        });
        if (!workOrder) return res.status(404).json({ error: 'Obra não encontrada.' });
        res.status(200).json(workOrder);
    } catch (e) {
        console.error('Erro ao obter obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.workOrder.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Obra não encontrada.' });

        const parsed = updateWorkOrderSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const { technicianIds, ...fields } = parsed.data;

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                ...fields,
                // `set` substitui a lista inteira, para que remover um técnico funcione.
                ...(technicianIds !== undefined
                    ? { technicians: { set: technicianIds.map(tid => ({ id: tid })) } }
                    : {}),
            },
            include: workOrderInclude,
        });
        res.status(200).json(workOrder);
    } catch (e) {
        console.error('Erro ao atualizar obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const workOrder = await prisma.workOrder.findUnique({
            where: { id },
            include: { documents: true },
        });
        if (!workOrder) return res.status(404).json({ error: 'Obra não encontrada.' });

        // Apagar os ficheiros do disco antes do registo — o cascade só limpa a base de dados.
        for (const doc of workOrder.documents) {
            try {
                await fs.unlink(doc.path);
            } catch (err) {
                console.warn('Não foi possível apagar o ficheiro', doc.path, err.message);
            }
        }

        await prisma.workOrder.delete({ where: { id } });
        res.status(200).json({ message: 'Obra eliminada.' });
    } catch (e) {
        console.error('Erro ao eliminar obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Assinatura ── */

exports.saveSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.workOrder.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Obra não encontrada.' });

        const parsed = signatureSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                signatureData: parsed.data.signatureData,
                signedByName: parsed.data.signedByName,
                signedAt: new Date(),
            },
            include: workOrderInclude,
        });
        res.status(200).json(workOrder);
    } catch (e) {
        console.error('Erro ao guardar assinatura:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.workOrder.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Obra não encontrada.' });

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: { signatureData: null, signedByName: null, signedAt: null },
            include: workOrderInclude,
        });
        res.status(200).json(workOrder);
    } catch (e) {
        console.error('Erro ao remover assinatura:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Documentos ── */

exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const workOrder = await prisma.workOrder.findUnique({ where: { id } });
        if (!workOrder) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum ficheiro foi enviado.' });

        const originalName = fixEncoding(req.file.originalname);
        const kind = DOC_KINDS.includes(req.body.kind) ? req.body.kind : 'documento';

        const document = await prisma.workOrderDocument.create({
            data: {
                kind,
                filename: '',
                path: '',
                originalName,
                workOrder: { connect: { id } },
                uploadedBy: { connect: { id: req.user.id } },
            },
        });

        // Os esquemas de implementação podem ser imagens, por isso preserva-se a extensão real.
        const ext = path.extname(originalName) || '';
        const storedName = `${document.id}${ext}`;
        const oldPath = path.resolve(req.file.path);
        const newPath = path.resolve(path.dirname(oldPath), storedName);
        await fs.rename(oldPath, newPath);

        const updated = await prisma.workOrderDocument.update({
            where: { id: document.id },
            data: { filename: storedName, path: newPath },
            select: { id: true, kind: true, originalName: true, uploadedAt: true },
        });

        res.status(201).json(updated);
    } catch (e) {
        console.error('Erro ao carregar documento:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getDocument = async (req, res) => {
    try {
        const doc = await prisma.workOrderDocument.findUnique({ where: { id: req.params.docId } });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
        res.download(path.resolve(doc.path), doc.originalName);
    } catch (e) {
        console.error('Erro ao enviar documento:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await prisma.workOrderDocument.findUnique({ where: { id: req.params.docId } });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        try {
            await fs.unlink(doc.path);
        } catch (err) {
            console.warn('Não foi possível apagar o ficheiro físico:', err.message);
        }

        await prisma.workOrderDocument.delete({ where: { id: doc.id } });
        res.status(200).json({ message: 'Documento eliminado.' });
    } catch (e) {
        console.error('Erro ao eliminar documento:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Relatório por email ── */

exports.sendWorkOrderEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const workOrder = await prisma.workOrder.findUnique({
            where: { id },
            include: workOrderInclude,
        });
        if (!workOrder) return res.status(404).json({ error: 'Obra não encontrada.' });

        const parsed = sendReportSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const { pdf, clientEmail, sendToCompany, message } = parsed.data;

        const recipients = [...new Set([
            clientEmail,
            sendToCompany ? process.env.OVERTIME_RECIPIENT_EMAIL : null,
        ].filter(Boolean))];

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Indique pelo menos um destinatário.' });
        }

        const safeObra = workOrder.obra.replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '');
        const dateStr = new Date(workOrder.date).toISOString().slice(0, 10);

        const messageBlock = message
            ? `<p>${message.replace(/\n/g, '<br/>')}</p>`
            : '';

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"LOG" <${process.env.SMTP_USER}>`,
            to: recipients.join(', '),
            subject: `Folha de Obra #${workOrder.orderNumber} — ${workOrder.client} — ${workOrder.obra}`,
            html: `
                <p>Segue em anexo o relatório da obra <strong>#${workOrder.orderNumber}</strong>.</p>
                <p>
                    <strong>Cliente:</strong> ${workOrder.client}<br/>
                    <strong>Obra:</strong> ${workOrder.obra}<br/>
                    <strong>Tipo:</strong> ${TYPE_LABELS[workOrder.type] ?? workOrder.type}<br/>
                    <strong>Data:</strong> ${new Date(workOrder.date).toLocaleDateString('pt-PT')}${
                        workOrder.startTime && workOrder.endTime
                            ? ` (${workOrder.startTime} — ${workOrder.endTime})`
                            : ''
                    }
                </p>
                ${messageBlock}
            `,
            attachments: [{
                filename: `folha-obra-${workOrder.orderNumber}-${safeObra}-${dateStr}.pdf`,
                content: Buffer.from(pdf, 'base64'),
                contentType: 'application/pdf',
            }],
        });

        res.status(200).json({ message: 'Relatório enviado.', recipients });
    } catch (e) {
        console.error('Erro ao enviar relatório da obra:', e);
        res.status(500).json({ error: 'Erro ao enviar o email.' });
    }
};
