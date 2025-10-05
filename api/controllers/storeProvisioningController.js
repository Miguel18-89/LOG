const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.createStoreProvisioning = async (req, res) => {
    try {
        const {
            ordered,
            trackingNumber,
            received,
            validated,
            status,
            storeId,
            userId,
        } = req.body;

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

        res.status(201).json({ message: 'Provisioning created successfully', provisioning: newProvisioning });
    } catch (e) {
        console.error('Erro ao criar aprovisionamento:', e);
        res.status(500).json('Something went wrong');
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
        const { id } = req.params;
        const {
            storeId,
            userId,
            ordered,
            trackingNumber,
            received,
            validated,
            status,
        } = req.body;

        const data = {
            ordered,
            trackingNumber,
            received,
            validated,
            status,
            ...(storeId && { store_id: storeId }),
            updated_by: userId,
        };

        const provisioningId = id || (
            storeId
                ? (await prisma.provisioning.findFirst({ where: { store_id: storeId } }))?.id
                : null
        );

        await prisma.provisioning.upsert({
            where: { store_id: storeId },
            update: {
                ordered,
                trackingNumber,
                received,
                validated,
                status,
                updatedBy: {
                    connect: { id: userId }
                },
            },
            create: {
                ordered,
                trackingNumber,
                received,
                validated,
                status,
                storeId: {
                    connect: { id: storeId }
                },
                updatedBy: {
                    connect: { id: userId }
                },
            },
        });


        res.status(200).json({
            message: 'Provisioning atualizado ou criado com sucesso',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar provisioning' });
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
