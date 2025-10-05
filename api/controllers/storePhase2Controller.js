const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.createStorePhase2 = async (req, res) => {
    try {
        const {
            kls,
            acrylics,
            hotButtons,
            eas,
            tiko,
            ovens,
            quailDigital,
            smc,
            amplifier,
            tests,
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

        const newPhase2 = await prisma.phase2.create({
            data: {
                kls,
                acrylics,
                hotButtons,
                eas,
                tiko,
                ovens,
                quailDigital,
                smc,
                amplifier,
                tests,
                status,
                updatedBy: {
                    connect: { id: userId },
                },
                storeId: {
                    connect: { id: storeId },
                },
            },
        });

        res.status(201).json({ message: 'Phase2 created successfully', phase2: newPhase2 });
    } catch (e) {
        console.error('Erro ao criar a fase 2:', e);
        res.status(500).json('Something went wrong');
    }
};


exports.getAllPhase2s = async (req, res) => {
    try {
        const allPhase2s = await prisma.phase2.findMany();
        res.status(200).json({ allPhase2s });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getPhase2ById = async (req, res) => {
    try {
        const { id } = req.params;
        const phase2 = await prisma.phase2.findUnique({
            where: {
                id: id,
            },
        });
        if (!phase2) {
            return res.status(404).json({ error: 'Phase2 not found' });
        }
        res.status(200).json({ phase2 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getPhase2ByStoreId = async (req, res) => {
    try {
        const { storeId } = req.body;
        const storePhase2 = await prisma.phase2.findUnique({
            where: {
                storeId: storeId,
            },
        });
        if (!storePhase2) {
            return res.status(404).json({ error: 'Store Phase2 not found' });
        }
        res.status(200).json({ storePhase2 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.updatePhase2 = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            kls,
            acrylics,
            hotButtons,
            eas,
            tiko,
            ovens,
            quailDigital,
            smc,
            amplifier,
            tests,
            storeId,
            userId,
            status,
        } = req.body;

        const data = {
            kls,
            acrylics,
            hotButtons,
            eas,
            tiko,
            ovens,
            quailDigital,
            smc,
            amplifier,
            tests,
            status,
            ...(storeId && { store_id: storeId }),
            updated_by: userId,
        };

        const phase2Id = id || (
            storeId
                ? (await prisma.phase2.findFirst({ where: { store_id: storeId } }))?.id
                : null
        );

        await prisma.phase2.upsert({
            where: { store_id: storeId },
            update: {
                kls,
                acrylics,
                hotButtons,
                eas,
                tiko,
                ovens,
                quailDigital,
                smc,
                amplifier,
                tests,
                status,
                updatedBy: {
                    connect: { id: userId }
                },
            },
            create: {
                kls,
                acrylics,
                hotButtons,
                eas,
                tiko,
                ovens,
                quailDigital,
                smc,
                amplifier,
                tests,
                status,
                storeId: {
                    connect: { id: storeId }
                },
                updatedBy: {
                    connect: { id: userId }
                },
            },
        });


        const updatedPhase2 = await prisma.phase2.findFirst({
            where: { store_id: storeId },
        });

        const user = await prisma.user.findUnique({
            where: { id: updatedPhase2?.updated_by },
            select: { name: true },
        });

        res.status(200).json({
            ...updatedPhase2,
            updated_by: updatedPhase2?.updated_by,
            updated_at: updatedPhase2?.updated_at,
            updatedByName: user?.name ?? 'Desconhecido',
        });




    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar 2ª Fase' });
    }
};



exports.deletePhase2 = async (req, res) => {
    try {
        const { id } = req.params;
        const phase2Exist = await prisma.phase2.findUnique({
            where: { id: id },
        });
        if (!phase2Exist) {
            return res.status(404).json({ error: 'Phase2 not found' });
        }
        await prisma.phase2.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Phase2 deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
