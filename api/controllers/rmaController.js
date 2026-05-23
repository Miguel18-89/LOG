const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
                include: { createdBy: { select: { id: true, name: true } } },
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
        const exists = await prisma.rMA.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ error: 'RMA não encontrado.' });
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
