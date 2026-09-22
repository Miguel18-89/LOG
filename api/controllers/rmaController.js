const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs/promises');
const prisma = new PrismaClient();

// As listas brancas e a legenda são as mesmas das obras: a regra de que ficheiros
// se aceitam não muda de módulo para módulo.
const {
    DOC_KINDS, ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_MIMES, MAX_CAPTION, captionSchema,
} = require('../schemas/workOrderSchema.js');

const documentSelect = {
    select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
    orderBy: { uploadedAt: 'asc' },
};

const STATUS_VALID = ['no_cliente', 'em_armazem', 'em_reparacao', 'reparado_armazem', 'entregue'];

exports.createRMA = async (req, res) => {
    try {
        const { brand, model, serialNumber, fault, client, location, requestedBy, status, repairLocation } = req.body;
        const trim = s => (typeof s === 'string' ? s.trim() : s);
        const b = trim(brand), m = trim(model), sn = trim(serialNumber), f = trim(fault),
              c = trim(client), l = trim(location), rb = trim(requestedBy);
        if (!b || !m || !sn || !f || !c || !l || !rb)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
        if (b.length > 100 || m.length > 100 || sn.length > 100)
            return res.status(400).json({ error: 'Campos excedem o tamanho máximo permitido.' });
        const resolvedStatus = status || 'no_cliente';
        if (!STATUS_VALID.includes(resolvedStatus))
            return res.status(400).json({ error: 'Estado inválido.' });
        const rma = await prisma.rMA.create({
            data: {
                brand: b, model: m, serialNumber: sn, fault: f, client: c, location: l, requestedBy: rb,
                status: resolvedStatus,
                repairLocation: repairLocation?.trim() || null,
                openDate: new Date(),
                createdBy: { connect: { id: req.user.id } },
            },
            include: { createdBy: { select: { id: true, name: true } }, updates: { include: { createdBy: { select: { id: true, name: true } } } } },
        });
        res.status(201).json(rma);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllRMAs = async (req, res) => {
    try {
        const { status, client, page = 1, pageSize = 10 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (client) where.client = { contains: client, mode: 'insensitive' };

        const [data, total] = await Promise.all([
            prisma.rMA.findMany({
                where,
                skip: (parseInt(page) - 1) * parseInt(pageSize),
                take: parseInt(pageSize),
                orderBy: { rmaNumber: 'asc' },
                include: {
                    createdBy: { select: { id: true, name: true } },
                    // Pedido que originou este RMA, para se ver a origem.
                    ticket: { select: { id: true, ticketNumber: true, title: true } },
                    documents: documentSelect,
                },
            }),
            prisma.rMA.count({ where }),
        ]);

        res.status(200).json({ data, total });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getRMAById = async (req, res) => {
    try {
        const rma = await prisma.rMA.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true } },
                ticket: { select: { id: true, ticketNumber: true, title: true } },
                documents: documentSelect,
                updates: {
                    include: { createdBy: { select: { id: true, name: true } } },
                    orderBy: { created_at: 'asc' },
                },
            },
        });
        if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
        res.status(200).json(rma);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateRMA = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.rMA.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'RMA não encontrado.' });

        const { brand, model, serialNumber, fault, client, location, requestedBy, status, repairLocation } = req.body;
        if (status && !STATUS_VALID.includes(status))
            return res.status(400).json({ error: 'Estado inválido.' });
        const trim = s => (typeof s === 'string' ? s.trim() : undefined);
        const rma = await prisma.rMA.update({
            where: { id },
            data: {
                ...(brand && { brand: brand.trim() }),
                ...(model && { model: model.trim() }),
                ...(serialNumber && { serialNumber: serialNumber.trim() }),
                ...(fault && { fault: fault.trim() }),
                ...(client && { client: client.trim() }),
                ...(location && { location: location.trim() }),
                ...(requestedBy && { requestedBy: requestedBy.trim() }),
                ...(status && { status }),
                repairLocation: repairLocation !== undefined ? (trim(repairLocation) || null) : exists.repairLocation,
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                ticket: { select: { id: true, ticketNumber: true, title: true } },
                documents: documentSelect,
                updates: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { created_at: 'asc' } },
            },
        });
        res.status(200).json(rma);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteRMA = async (req, res) => {
    try {
        const exists = await prisma.rMA.findUnique({
            where: { id: req.params.id },
            include: { documents: true },
        });
        if (!exists) return res.status(404).json({ error: 'RMA não encontrado.' });

        // O cascade só limpa a base de dados; os ficheiros ficariam órfãos em disco.
        for (const doc of exists.documents) {
            try {
                await fs.unlink(doc.path);
            } catch (err) {
                console.warn('Não foi possível apagar o ficheiro', doc.path, err.message);
            }
        }

        await prisma.rMA.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'RMA eliminado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.addUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória.' });

        const exists = await prisma.rMA.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'RMA não encontrado.' });

        const update = await prisma.rMAUpdate.create({
            data: {
                message: message.trim(),
                rma: { connect: { id } },
                createdBy: { connect: { id: req.user.id } },
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });
        res.status(201).json(update);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};


/* -- Anexos -- */

// O multer guarda com o nome original em latin1; o resto da app corrige da mesma forma.
function fixEncoding(str) {
    return Buffer.from(str, 'latin1').toString('utf8');
}

exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.rMA.findUnique({ where: { id }, select: { id: true } });
        if (!exists) {
            // O multer já gravou o ficheiro em disco antes de chegarmos aqui.
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: 'RMA não encontrado.' });
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

        // A legenda pode vir logo no upload; o multipart traz tudo como texto.
        const caption = String(req.body.caption ?? '').trim().slice(0, MAX_CAPTION) || null;

        const document = await prisma.rMADocument.create({
            data: {
                kind,
                caption,
                filename: '',
                path: '',
                originalName,
                rma: { connect: { id } },
                uploadedBy: { connect: { id: req.user.id } },
            },
        });

        const storedName = `${document.id}${ext}`;
        const oldPath = path.resolve(req.file.path);
        const newPath = path.resolve(path.dirname(oldPath), storedName);
        await fs.rename(oldPath, newPath);

        const updated = await prisma.rMADocument.update({
            where: { id: document.id },
            data: { filename: storedName, path: newPath },
            select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
        });

        res.status(201).json(updated);
    } catch (e) {
        console.error('Erro ao carregar documento do RMA:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getDocument = async (req, res) => {
    try {
        // O documento tem de pertencer ao RMA do URL: procurar só por docId permitia
        // obter qualquer documento através de um RMA arbitrário.
        const doc = await prisma.rMADocument.findFirst({
            where: { id: req.params.docId, rma_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
        res.download(path.resolve(doc.path), doc.originalName);
    } catch (e) {
        console.error('Erro ao enviar documento do RMA:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/** Escreve ou apaga a legenda de um anexo. */
exports.updateDocumentCaption = async (req, res) => {
    try {
        const parsed = captionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues[0]?.message || 'Dados inválidos',
            });
        }

        const doc = await prisma.rMADocument.findFirst({
            where: { id: req.params.docId, rma_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        const updated = await prisma.rMADocument.update({
            where: { id: doc.id },
            data: { caption: parsed.data.caption },
            select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
        });
        res.status(200).json(updated);
    } catch (e) {
        console.error('Erro ao guardar legenda do RMA:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await prisma.rMADocument.findFirst({
            where: { id: req.params.docId, rma_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        try {
            await fs.unlink(doc.path);
        } catch (err) {
            console.warn('Não foi possível apagar o ficheiro físico:', err.message);
        }

        await prisma.rMADocument.delete({ where: { id: doc.id } });
        res.status(200).json({ message: 'Documento eliminado.' });
    } catch (e) {
        console.error('Erro ao eliminar documento do RMA:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};
