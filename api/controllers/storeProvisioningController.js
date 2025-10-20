const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { createProvisioningSchema } = require('../schemas/provisioningSchema.js');

exports.createStoreProvisioning = async (req, res) => {
    try {
        const parseResult = createProvisioningSchema.safeParse(req.body);

        if (!parseResult.success) {
            console.log("aqui")
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        if (!storeId || !userId) {
            return res.status(400).json('Store Id and User Id required');
        }

        const storeIdExist = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeIdExist) {
            return res.status(404).json('Store not found');
        }

        const newProvisioning = await prisma.provisioning.create({
            data: {
                ordered,
                trackingNumber,
                received,
                validated,
                status,
                updatedBy: {
                    connect: { id: userId },
                },
                storeId: {
                    connect: { id: storeId },
                },
            },
        });

        res.status(201).json({
            message: 'Provisioning created successfully',
            provisioning: newProvisioning,
        });
    } catch (e) {
        console.error('Erro ao criar survey:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};

exports.getAllProvisionings = async (req, res) => {
    try {
        const allProvisionings = await prisma.provisioning.findMany();
        res.status(200).json({ allProvisionings });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

exports.getProvisioningById = async (req, res) => {
    try {
        const { id } = req.params;
        const provisioning = await prisma.provisioning.findUnique({
            where: {
                id: id,
            },
        });
        if (!provisioning) {
            return res.status(404).json({ error: 'Provisioning not found' });
        }
        res.status(200).json({ provisioning });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getProvisioningByStoreId = async (req, res) => {
    try {
        const { storeId } = req.body;
        const storeProvisioning = await prisma.provisioning.findUnique({
            where: {
                storeId: storeId,
            },
        });
        if (!storeProvisioning) {
            return res.status(404).json({ error: 'Store Provisioning not found' });
        }
        res.status(200).json({ storeProvisioning });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.updateProvisioning = async (req, res) => {
    try {
        const parseResult = createProvisioningSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const {
            storeId,
            userId,
            ordered,
            trackingNumber,
            received,
            validated,
            status,
        } = parseResult.data;

        const provisioning = await prisma.provisioning.upsert({
            where: { store_id: storeId },
            update: {
                ordered,
                trackingNumber,
                received,
                validated,
                status,
                updatedBy: userId,
            },
            create: {
                ordered,
                trackingNumber,
                received,
                validated,
                status,
                storeId: {
                        connect: { id: storeId },
                    },

        updatedBy: userId,
            },
            include: {
                updatedBy: { select: { id: true, name: true } },
                storeId: { select: { id: true } },
            },
        });

        res.status(200).json(provisioning);
    } catch (error) {
        console.error('Erro ao atualizar provisioning:', error);
        res.status(500).json({ error: error.message || 'Erro ao processar provisioning' });
    }
};

exports.deleteProvisioning = async (req, res) => {
    try {
        const { id } = req.params;
        const provisioningExist = await prisma.provisioning.findUnique({
            where: { id: id },
        });
        if (!provisioningExist) {
            return res.status(404).json({ error: 'Store not found' });
        }
        await prisma.provisioning.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Provisioning deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
