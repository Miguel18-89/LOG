const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const vehicleInclude = {
    createdBy: { select: { id: true, name: true } },
    tireChanges: { orderBy: { date: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
    oilChanges:  { orderBy: { date: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
    repairs:     { orderBy: { date: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
};

/* ── Vehicles ── */

exports.createVehicle = async (req, res) => {
    try {
        const { brand, model, plate, registrationYear, registrationMonth, nextInspectionDate, insuranceExpiryDate, tireSize } = req.body;
        if (!brand || !model || !plate || !registrationYear || !registrationMonth)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const exists = await prisma.vehicle.findUnique({ where: { plate: plate.toUpperCase() } });
        if (exists) return res.status(409).json({ error: 'Já existe uma viatura com esta matrícula.' });

        const vehicle = await prisma.vehicle.create({
            data: {
                brand, model, plate: plate.toUpperCase(),
                registrationYear: parseInt(registrationYear),
                registrationMonth: parseInt(registrationMonth),
                nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
                insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : null,
                tireSize: tireSize || null,
                createdBy: { connect: { id: req.user.id } },
            },
            include: vehicleInclude,
        });
        res.status(201).json(vehicle);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllVehicles = async (req, res) => {
    try {
        const { plate } = req.query;
        const where = plate ? { plate: { contains: plate.toUpperCase(), mode: 'insensitive' } } : {};
        const vehicles = await prisma.vehicle.findMany({
            where,
            orderBy: { plate: 'asc' },
            include: {
                createdBy: { select: { id: true, name: true } },
                _count: { select: { tireChanges: true, oilChanges: true, repairs: true } },
            },
        });
        res.status(200).json(vehicles);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getVehicleById = async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: vehicleInclude });
        if (!vehicle) return res.status(404).json({ error: 'Viatura não encontrada.' });
        res.status(200).json(vehicle);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.vehicle.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Viatura não encontrada.' });

        const { brand, model, plate, registrationYear, registrationMonth, nextInspectionDate, insuranceExpiryDate, tireSize } = req.body;

        if (plate && plate.toUpperCase() !== exists.plate) {
            const conflict = await prisma.vehicle.findUnique({ where: { plate: plate.toUpperCase() } });
            if (conflict) return res.status(409).json({ error: 'Já existe uma viatura com esta matrícula.' });
        }

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: {
                ...(brand && { brand }),
                ...(model && { model }),
                ...(plate && { plate: plate.toUpperCase() }),
                ...(registrationYear && { registrationYear: parseInt(registrationYear) }),
                ...(registrationMonth && { registrationMonth: parseInt(registrationMonth) }),
                nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
                insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : null,
                tireSize: tireSize ?? exists.tireSize,
            },
            include: vehicleInclude,
        });
        res.status(200).json(vehicle);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteVehicle = async (req, res) => {
    try {
        const exists = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ error: 'Viatura não encontrada.' });
        await prisma.vehicle.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Viatura eliminada.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Tire Changes ── */

exports.addTireChange = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, location, km, type, notes } = req.body;
        if (!date || !location || !km || !type)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const record = await prisma.tireChange.create({
            data: { date: new Date(date), location, km: parseInt(km), type, notes: notes || null,
                vehicle: { connect: { id } }, createdBy: { connect: { id: req.user.id } } },
            include: { createdBy: { select: { id: true, name: true } } },
        });
        res.status(201).json(record);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteTireChange = async (req, res) => {
    try {
        await prisma.tireChange.delete({ where: { id: req.params.rid } });
        res.status(200).json({ message: 'Registo eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Algo correu mal.' }); }
};

/* ── Oil Changes ── */

exports.addOilChange = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, location, km, notes } = req.body;
        if (!date || !location || !km)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const record = await prisma.oilChange.create({
            data: { date: new Date(date), location, km: parseInt(km), notes: notes || null,
                vehicle: { connect: { id } }, createdBy: { connect: { id: req.user.id } } },
            include: { createdBy: { select: { id: true, name: true } } },
        });
        res.status(201).json(record);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteOilChange = async (req, res) => {
    try {
        await prisma.oilChange.delete({ where: { id: req.params.rid } });
        res.status(200).json({ message: 'Registo eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Algo correu mal.' }); }
};

/* ── Repairs ── */

exports.addRepair = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, fault, repairLocation, km, notes } = req.body;
        if (!date || !fault || !repairLocation || !km)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const record = await prisma.vehicleRepair.create({
            data: { date: new Date(date), fault, repairLocation, km: parseInt(km), notes: notes || null,
                vehicle: { connect: { id } }, createdBy: { connect: { id: req.user.id } } },
            include: { createdBy: { select: { id: true, name: true } } },
        });
        res.status(201).json(record);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteRepair = async (req, res) => {
    try {
        await prisma.vehicleRepair.delete({ where: { id: req.params.rid } });
        res.status(200).json({ message: 'Registo eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Algo correu mal.' }); }
};
