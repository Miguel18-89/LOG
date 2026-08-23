const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs/promises');
const prisma = new PrismaClient();

const {
    TYPE_VALID, STATUS_VALID, DOC_KINDS, ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_MIMES,
    workOrderSchema, updateWorkOrderSchema, signatureSchema, sendReportSchema,
} = require('../schemas/workOrderSchema.js');

const ROLE_ADMIN = 2;

const TYPE_LABELS = {
    instalacao: 'Instalação',
    manutencao: 'Manutenção',
    reparacao: 'Reparação',
};

const workOrderInclude = {
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
    // workEmail é lido para decidir permissões e removido antes de responder.
    technicians: { select: { id: true, fullName: true, workEmail: true }, orderBy: { fullName: 'asc' } },
    documents: {
        select: { id: true, kind: true, originalName: true, uploadedAt: true },
        orderBy: { uploadedAt: 'asc' },
    },
};

// A listagem não devolve `signatureData`: são imagens de assinaturas manuscritas de
// clientes (dados pessoais) e nenhum dos clientes precisa delas na lista — só o
// detalhe as usa. `signedAt`/`signedByName` chegam para mostrar "Assinada".
const workOrderListSelect = {
    id: true, orderNumber: true, client: true, obra: true, type: true, status: true,
    date: true, startTime: true, endTime: true, tasks: true, materials: true, notes: true,
    signedByName: true, signedAt: true, externalTechnicians: true,
    created_at: true, updated_at: true, user_id: true,
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
    // workEmail é lido para decidir permissões e removido antes de responder.
    technicians: { select: { id: true, fullName: true, workEmail: true }, orderBy: { fullName: 'asc' } },
    documents: {
        select: { id: true, kind: true, originalName: true, uploadedAt: true },
        orderBy: { uploadedAt: 'asc' },
    },
};

const MAX_PAGE_SIZE = 100;

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

// Escapa texto que vai para dentro do HTML do email. Sem isto, o nome do cliente
// ou a mensagem podiam injetar markup no email enviado a partir do domínio da empresa.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Regra única de quem pode alterar uma obra. `technicians` tem de incluir workEmail. */
function userCanEdit(user, workOrder) {
    if (user.role >= ROLE_ADMIN) return true;
    if (workOrder.user_id === user.id) return true;
    const email = user.email?.toLowerCase();
    return !!email && (workOrder.technicians ?? [])
        .some(t => t.workEmail?.toLowerCase() === email);
}

/**
 * Prepara a obra para resposta: acrescenta `canEdit` (para os clientes saberem que
 * ações mostrar, sem duplicarem a regra) e retira o workEmail dos técnicos, que só
 * é lido internamente para decidir permissões.
 */
function withPermissions(workOrder, user) {
    const canEdit = userCanEdit(user, workOrder);
    const technicians = (workOrder.technicians ?? []).map(({ workEmail, ...t }) => t);
    return { ...workOrder, technicians, canEdit, canDelete: user.role >= ROLE_ADMIN };
}

/**
 * Carrega a obra e decide se o utilizador a pode alterar.
 * Podem editar: administradores, os técnicos associados à obra (ligados por
 * Employee.workEmail === user.email, o mesmo critério usado nas Férias) e quem
 * a criou — sem esta última condição, quem cria uma obra sem se associar como
 * técnico ficaria imediatamente sem acesso ao próprio registo.
 * Devolve { workOrder } ou { error } já respondido.
 */
async function loadEditableWorkOrder(req, res) {
    const workOrder = await prisma.workOrder.findUnique({
        where: { id: req.params.id },
        include: { technicians: { select: { id: true, workEmail: true } } },
    });
    if (!workOrder) {
        res.status(404).json({ error: 'Obra não encontrada.' });
        return null;
    }
    if (req.user.role >= ROLE_ADMIN) return workOrder;
    if (workOrder.user_id === req.user.id) return workOrder;

    const email = req.user.email?.toLowerCase();
    const isTechnician = email
        && workOrder.technicians.some(t => t.workEmail?.toLowerCase() === email);
    if (isTechnician) return workOrder;

    res.status(403).json({
        error: 'Só os técnicos associados a esta obra ou um administrador a podem alterar.',
    });
    return null;
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

        const { technicianIds, externalTechnicians, notes, ...data } = parsed.data;

        const workOrder = await prisma.workOrder.create({
            data: {
                ...data,
                notes: notes || null,
                externalTechnicians: externalTechnicians ?? [],
                technicians: { connect: (technicianIds ?? []).map(id => ({ id })) },
                createdBy: { connect: { id: req.user.id } },
            },
            include: workOrderInclude,
        });
        res.status(201).json(withPermissions(workOrder, req.user));
    } catch (e) {
        console.error('Erro ao criar obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllWorkOrders = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), MAX_PAGE_SIZE);
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
                select: workOrderListSelect,
            }),
            prisma.workOrder.count({ where }),
        ]);

        res.status(200).json({ data: data.map(o => withPermissions(o, req.user)), total });
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
        res.status(200).json(withPermissions(workOrder, req.user));
    } catch (e) {
        console.error('Erro ao obter obra:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!await loadEditableWorkOrder(req, res)) return;

        const parsed = updateWorkOrderSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const { technicianIds, ...fields } = parsed.data;

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                ...fields,
                updatedBy: { connect: { id: req.user.id } },
                // `set` substitui a lista inteira, para que remover um técnico funcione.
                ...(technicianIds !== undefined
                    ? { technicians: { set: technicianIds.map(tid => ({ id: tid })) } }
                    : {}),
            },
            include: workOrderInclude,
        });
        res.status(200).json(withPermissions(workOrder, req.user));
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
        const existing = await loadEditableWorkOrder(req, res);
        if (!existing) return;

        // A assinatura é a prova de aceitação do cliente: uma vez recolhida não pode
        // ser substituída. Se estiver errada, um administrador remove-a e só depois
        // pode ser recolhida de novo.
        if (existing.signatureData) {
            return res.status(409).json({
                error: 'Esta obra já está assinada. Para corrigir, um administrador tem de remover a assinatura primeiro.',
            });
        }

        const parsed = signatureSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                signatureData: parsed.data.signatureData,
                signedByName: parsed.data.signedByName,
                signedAt: new Date(),
                updatedBy: { connect: { id: req.user.id } },
            },
            include: workOrderInclude,
        });
        res.status(200).json(withPermissions(workOrder, req.user));
    } catch (e) {
        console.error('Erro ao guardar assinatura:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteSignature = async (req, res) => {
    try {
        // A rota já exige administrador: a assinatura é a prova de aceitação do
        // cliente e não deve poder ser destruída por quem executou a obra.
        const { id } = req.params;
        const exists = await prisma.workOrder.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Obra não encontrada.' });

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                signatureData: null,
                signedByName: null,
                signedAt: null,
                updatedBy: { connect: { id: req.user.id } },
            },
            include: workOrderInclude,
        });
        res.status(200).json(withPermissions(workOrder, req.user));
    } catch (e) {
        console.error('Erro ao remover assinatura:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Documentos ── */

exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const workOrder = await loadEditableWorkOrder(req, res);
        if (!workOrder) {
            // O multer já gravou o ficheiro em disco antes de chegarmos aqui.
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return;
        }
        if (!req.file) return res.status(400).json({ error: 'Nenhum ficheiro foi enviado.' });

        const originalName = fixEncoding(req.file.originalname);
        const kind = DOC_KINDS.includes(req.body.kind) ? req.body.kind : 'documento';

        // Lista branca: sem isto era possível guardar .html/.svg com <script>.
        const ext = path.extname(originalName).toLowerCase();
        const mime = (req.file.mimetype || '').toLowerCase();
        if (!ALLOWED_UPLOAD_EXTS.includes(ext) || !ALLOWED_UPLOAD_MIMES.includes(mime)) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({
                error: `Tipo de ficheiro não permitido. Aceites: ${ALLOWED_UPLOAD_EXTS.join(', ')}`,
            });
        }

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

        // Os esquemas de implementação podem ser imagens, por isso preserva-se a extensão
        // real — mas só depois de validada contra a lista branca acima.
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
        // O documento tem de pertencer à obra do URL: procurar só por docId permitia
        // obter qualquer documento através de uma obra arbitrária.
        const doc = await prisma.workOrderDocument.findFirst({
            where: { id: req.params.docId, workOrder_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
        res.download(path.resolve(doc.path), doc.originalName);
    } catch (e) {
        console.error('Erro ao enviar documento:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        if (!await loadEditableWorkOrder(req, res)) return;

        const doc = await prisma.workOrderDocument.findFirst({
            where: { id: req.params.docId, workOrder_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        try {
            await fs.unlink(doc.path);
        } catch (err) {
            console.warn('Não foi possível apagar o ficheiro físico:', err.message);
        }

        await prisma.workOrderDocument.delete({ where: { id: doc.id } });
        await prisma.workOrder.update({
            where: { id: req.params.id },
            data: { updatedBy: { connect: { id: req.user.id } } },
        });
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
        // Enviar o relatório a um cliente é uma ação em nome da empresa: exige as
        // mesmas permissões que editar a obra.
        if (!await loadEditableWorkOrder(req, res)) return;

        const workOrder = await prisma.workOrder.findUnique({
            where: { id },
            include: workOrderInclude,
        });

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
            ? `<p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`
            : '';

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"LOG" <${process.env.SMTP_USER}>`,
            to: recipients.join(', '),
            subject: `Folha de Obra #${workOrder.orderNumber} — ${workOrder.client} — ${workOrder.obra}`,
            html: `
                <p>Segue em anexo o relatório da obra <strong>#${workOrder.orderNumber}</strong>.</p>
                <p>
                    <strong>Cliente:</strong> ${escapeHtml(workOrder.client)}<br/>
                    <strong>Obra:</strong> ${escapeHtml(workOrder.obra)}<br/>
                    <strong>Tipo:</strong> ${escapeHtml(TYPE_LABELS[workOrder.type] ?? workOrder.type)}<br/>
                    <strong>Data:</strong> ${new Date(workOrder.date).toLocaleDateString('pt-PT')}${
                        workOrder.startTime && workOrder.endTime
                            ? ` (${workOrder.startTime} — ${workOrder.endTime})`
                            : ''
                    }<br/>
                    <strong>Técnicos:</strong> ${
                        escapeHtml([
                            ...(workOrder.technicians ?? []).map(t => t.fullName),
                            ...(workOrder.externalTechnicians ?? []),
                        ].join(', ')) || '—'
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
