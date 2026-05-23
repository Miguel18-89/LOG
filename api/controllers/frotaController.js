const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;
const CURRENT_YEAR = () => new Date().getFullYear();

function validateDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

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
        if (!brand?.trim() || !model?.trim() || !plate?.trim() || !registrationYear || !registrationMonth)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const plateFmt = plate.trim().toUpperCase();
        if (!PLATE_REGEX.test(plateFmt))
            return res.status(400).json({ error: 'Formato de matrícula inválido (ex: AB-12-CD).' });

        const year = parseInt(registrationYear);
        const month = parseInt(registrationMonth);
        if (isNaN(year) || year < 1900 || year > CURRENT_YEAR() + 1)
            return res.status(400).json({ error: 'Ano de matrícula inválido.' });
        if (isNaN(month) || month < 1 || month > 12)
            return res.status(400).json({ error: 'Mês de matrícula inválido.' });

        const exists = await prisma.vehicle.findUnique({ where: { plate: plateFmt } });
        if (exists) return res.status(409).json({ error: 'Já existe uma viatura com esta matrícula.' });

        const vehicle = await prisma.vehicle.create({
            data: {
                brand: brand.trim(), model: model.trim(), plate: plateFmt,
                registrationYear: year, registrationMonth: month,
                nextInspectionDate: validateDate(nextInspectionDate),
                insuranceExpiryDate: validateDate(insuranceExpiryDate),
                tireSize: tireSize?.trim() || null,
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
        if (!date || !location?.trim() || !km || !type?.trim())
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
        const parsedKm = parseInt(km);
        if (isNaN(parsedKm) || parsedKm < 0)
            return res.status(400).json({ error: 'Quilometragem inválida.' });
        const parsedDate = validateDate(date);
        if (!parsedDate) return res.status(400).json({ error: 'Data inválida.' });

        const record = await prisma.tireChange.create({
            data: { date: parsedDate, location: location.trim(), km: parsedKm, type: type.trim(), notes: notes?.trim() || null,
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
        if (!date || !location?.trim() || !km)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
        const parsedKm = parseInt(km);
        if (isNaN(parsedKm) || parsedKm < 0)
            return res.status(400).json({ error: 'Quilometragem inválida.' });
        const parsedDate = validateDate(date);
        if (!parsedDate) return res.status(400).json({ error: 'Data inválida.' });

        const record = await prisma.oilChange.create({
            data: { date: parsedDate, location: location.trim(), km: parsedKm, notes: notes?.trim() || null,
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
        if (!date || !fault?.trim() || !repairLocation?.trim() || !km)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
        const parsedKm = parseInt(km);
        if (isNaN(parsedKm) || parsedKm < 0)
            return res.status(400).json({ error: 'Quilometragem inválida.' });
        const parsedDate = validateDate(date);
        if (!parsedDate) return res.status(400).json({ error: 'Data inválida.' });

        const record = await prisma.vehicleRepair.create({
            data: { date: parsedDate, fault: fault.trim(), repairLocation: repairLocation.trim(), km: parsedKm, notes: notes?.trim() || null,
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
