const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs/promises');

const employeeInclude = {
    createdBy: { select: { id: true, name: true } },
    trainings: {
        orderBy: { date: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
    },
};

/* ── Employees ── */

exports.createEmployee = async (req, res) => {
    try {
        const {
            fullName, nif, cc, niss, birthDate, address, phone,
            personalEmail, workEmail, emergencyContactName, emergencyContactRel, emergencyContactPhone,
            admissionDate, contractType, jobCategory,
            iban, insurancePolicy, medicalFitnessDate,
        } = req.body;

        if (!fullName) return res.status(400).json({ error: 'Nome obrigatório.' });

        if (nif) {
            const exists = await prisma.employee.findUnique({ where: { nif } });
            if (exists) return res.status(409).json({ error: 'Já existe um colaborador com este NIF.' });
        }
        if (cc) {
            const exists = await prisma.employee.findUnique({ where: { cc } });
            if (exists) return res.status(409).json({ error: 'Já existe um colaborador com este CC/BI.' });
        }
        if (niss) {
            const exists = await prisma.employee.findUnique({ where: { niss } });
            if (exists) return res.status(409).json({ error: 'Já existe um colaborador com este NISS.' });
        }

        const employee = await prisma.employee.create({
            data: {
                fullName,
                nif: nif || null, cc: cc || null, niss: niss || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                address: address || null, phone: phone || null,
                personalEmail: personalEmail || null, workEmail: workEmail || null,
                emergencyContactName: emergencyContactName || null,
                emergencyContactRel: emergencyContactRel || null,
                emergencyContactPhone: emergencyContactPhone || null,
                admissionDate: admissionDate ? new Date(admissionDate) : null,
                contractType: contractType || null, jobCategory: jobCategory || null,
                iban: iban || null,
                insurancePolicy: insurancePolicy || null,
                medicalFitnessDate: medicalFitnessDate ? new Date(medicalFitnessDate) : null,
                createdBy: { connect: { id: req.user.id } },
            },
            include: employeeInclude,
        });
        res.status(201).json(employee);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllEmployees = async (req, res) => {
    try {
        const { name } = req.query;
        const where = {};
        if (name) where.fullName = { contains: name, mode: 'insensitive' };

        const employees = await prisma.employee.findMany({
            where,
            orderBy: { fullName: 'asc' },
            include: {
                createdBy: { select: { id: true, name: true } },
                _count: { select: { trainings: true } },
            },
        });
        res.status(200).json(employees);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
            include: employeeInclude,
        });
        if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado.' });
        res.status(200).json(employee);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.employee.findUnique({ where: { id } });
        if (!exists) return res.status(404).json({ error: 'Colaborador não encontrado.' });

        const {
            fullName, nif, cc, niss, birthDate, address, phone,
            personalEmail, workEmail, emergencyContactName, emergencyContactRel, emergencyContactPhone,
            admissionDate, contractType, jobCategory,
            iban, insurancePolicy, medicalFitnessDate,
        } = req.body;

        if (nif && nif !== exists.nif) {
            const conflict = await prisma.employee.findUnique({ where: { nif } });
            if (conflict) return res.status(409).json({ error: 'Já existe um colaborador com este NIF.' });
        }
        if (cc && cc !== exists.cc) {
            const conflict = await prisma.employee.findUnique({ where: { cc } });
            if (conflict) return res.status(409).json({ error: 'Já existe um colaborador com este CC/BI.' });
        }
        if (niss && niss !== exists.niss) {
            const conflict = await prisma.employee.findUnique({ where: { niss } });
            if (conflict) return res.status(409).json({ error: 'Já existe um colaborador com este NISS.' });
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                ...(fullName && { fullName }),
                nif: nif || null, cc: cc || null, niss: niss || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                address: address || null, phone: phone || null,
                personalEmail: personalEmail || null, workEmail: workEmail || null,
                emergencyContactName: emergencyContactName || null,
                emergencyContactRel: emergencyContactRel || null,
                emergencyContactPhone: emergencyContactPhone || null,
                admissionDate: admissionDate ? new Date(admissionDate) : null,
                contractType: contractType || null, jobCategory: jobCategory || null,
                iban: iban || null,
                insurancePolicy: insurancePolicy || null,
                medicalFitnessDate: medicalFitnessDate ? new Date(medicalFitnessDate) : null,
            },
            include: employeeInclude,
        });
        res.status(200).json(employee);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const exists = await prisma.employee.findUnique({
            where: { id: req.params.id },
            include: { trainings: true },
        });
        if (!exists) return res.status(404).json({ error: 'Colaborador não encontrado.' });

        for (const t of exists.trainings) {
            if (t.filePath) {
                try { await fs.unlink(t.filePath); } catch {}
            }
        }

        await prisma.employee.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Colaborador eliminado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Trainings ── */

async function moveFile(req, trainingId) {
    if (!req.file) return null;
    const ext = path.extname(req.file.originalname) || '';
    const uuidFilename = `training_${trainingId}${ext}`;
    const newPath = path.resolve('uploads', uuidFilename);
    await fs.rename(path.resolve(req.file.path), newPath);
    return {
        filename: uuidFilename,
        originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        filePath: newPath,
    };
}

exports.addTraining = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, hours } = req.body;

        if (!name || !date || !hours)
            return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

        const training = await prisma.training.create({
            data: {
                name,
                date: new Date(date),
                hours: parseFloat(hours),
                employee: { connect: { id } },
                createdBy: { connect: { id: req.user.id } },
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        if (req.file) {
            try {
                const fileData = await moveFile(req, training.id);
                const updated = await prisma.training.update({
                    where: { id: training.id },
                    data: fileData,
                    include: { createdBy: { select: { id: true, name: true } } },
                });
                return res.status(201).json(updated);
            } catch (err) {
                console.error('Erro ao mover ficheiro:', err);
            }
        }

        res.status(201).json(training);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateTraining = async (req, res) => {
    try {
        const training = await prisma.training.findUnique({ where: { id: req.params.rid } });
        if (!training) return res.status(404).json({ error: 'Formação não encontrada.' });

        const { name, date, hours } = req.body;
        const data = {};
        if (name) data.name = name;
        if (date) data.date = new Date(date);
        if (hours) data.hours = parseFloat(hours);

        if (req.file) {
            if (training.filePath) {
                try { await fs.unlink(training.filePath); } catch {}
            }
            try {
                const fileData = await moveFile(req, training.id);
                Object.assign(data, fileData);
            } catch (err) {
                console.error('Erro ao mover ficheiro:', err);
            }
        }

        const updated = await prisma.training.update({
            where: { id: req.params.rid },
            data,
            include: { createdBy: { select: { id: true, name: true } } },
        });
        res.status(200).json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getTrainingFile = async (req, res) => {
    try {
        const training = await prisma.training.findUnique({ where: { id: req.params.rid } });
        if (!training || !training.filePath)
            return res.status(404).json({ error: 'Ficheiro não encontrado.' });
        res.download(path.resolve(training.filePath), training.originalName || training.filename);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.uploadMedicalFile = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });

        if (employee.medicalFitnessFilePath) {
            try { await fs.unlink(employee.medicalFitnessFilePath); } catch {}
        }

        const ext = path.extname(req.file.originalname) || '';
        const filename = `medical_${id}${ext}`;
        const newPath = path.resolve('uploads', filename);
        await fs.rename(path.resolve(req.file.path), newPath);
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        const updated = await prisma.employee.update({
            where: { id },
            data: { medicalFitnessFilename: filename, medicalFitnessOriginalName: originalName, medicalFitnessFilePath: newPath },
            include: employeeInclude,
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getMedicalFile = async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
        if (!employee || !employee.medicalFitnessFilePath)
            return res.status(404).json({ error: 'Ficheiro não encontrado.' });
        res.download(path.resolve(employee.medicalFitnessFilePath), employee.medicalFitnessOriginalName || employee.medicalFitnessFilename);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteMedicalFile = async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
        if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado.' });
        if (employee.medicalFitnessFilePath) {
            try { await fs.unlink(employee.medicalFitnessFilePath); } catch {}
        }
        const updated = await prisma.employee.update({
            where: { id: req.params.id },
            data: { medicalFitnessFilename: null, medicalFitnessOriginalName: null, medicalFitnessFilePath: null },
            include: employeeInclude,
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteTraining = async (req, res) => {
    try {
        const training = await prisma.training.findUnique({ where: { id: req.params.rid } });
        if (!training) return res.status(404).json({ error: 'Formação não encontrada.' });

        if (training.filePath) {
            try { await fs.unlink(training.filePath); } catch {}
        }

        await prisma.training.delete({ where: { id: req.params.rid } });
        res.status(200).json({ message: 'Formação eliminada.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};
