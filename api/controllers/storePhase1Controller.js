const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.createStorePhase1 = async (req, res) => {
    try {
        const {
            cablesSalesArea,
            cablesBakery,
            cablesWarehouse,
            cablesBackoffice,
            speakersSalesArea,
            speakersBakery,
            speakersWarehouse,
            speakersBackoffice,
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

        const newPhase1 = await prisma.phase1.create({
            data: {
                cablesSalesArea,
                cablesBakery,
                cablesWarehouse,
                cablesBackoffice,
                speakersSalesArea,
                speakersBakery,
                speakersWarehouse,
                speakersBackoffice,
                status,
                updatedBy: {
                    connect: { id: userId },
                },
                storeId: {
                    connect: { id: storeId },
                },
            },
        });

        res.status(201).json({ message: 'Phase1 created successfully', phase1: newPhase1 });
    } catch (e) {
        console.error('Erro ao criar a fase 1:', e);
        res.status(500).json('Something went wrong');
    }
};


exports.getAllPhase1s = async (req, res) => {
    try {
        const allPhase1s = await prisma.phase1.findMany();
        res.status(200).json({ allPhase1s });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getPhase1ById = async (req, res) => {
    try {
        const { id } = req.params;
        const phase1 = await prisma.phase1.findUnique({
            where: {
                id: id,
            },
        });
        if (!phase1) {
            return res.status(404).json({ error: 'Phase1 not found' });
        }
        res.status(200).json({ phase1 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getPhase1ByStoreId = async (req, res) => {
    try {
        const { storeId } = req.body;
        const storePhase1 = await prisma.phase1.findUnique({
            where: {
                storeId: storeId,
            },
        });
        if (!storePhase1) {
            return res.status(404).json({ error: 'Store Phase1 not found' });
        }
        res.status(200).json({ storePhase1 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.updatePhase1 = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            cablesSalesArea,
            cablesBakery,
            cablesWarehouse,
            cablesBackoffice,
            speakersSalesArea,
            speakersBakery,
            speakersWarehouse,
            speakersBackoffice,
            storeId,
            userId,
            status,
        } = req.body;

        const data = {
            cablesSalesArea,
            cablesBakery,
            cablesWarehouse,
            cablesBackoffice,
            speakersSalesArea,
            speakersBakery,
            speakersWarehouse,
            speakersBackoffice,
            status,
            ...(storeId && { store_id: storeId }),
            updated_by: userId,
        };

        const phase1Id = id || (
            storeId
                ? (await prisma.phase1.findFirst({ where: { store_id: storeId } }))?.id
                : null
        );

        await prisma.phase1.upsert({
            where: { store_id: storeId },
            update: {
                cablesSalesArea,
                cablesBakery,
                cablesWarehouse,
                cablesBackoffice,
                speakersSalesArea,
                speakersBakery,
                speakersWarehouse,
                speakersBackoffice,
                status,
                updatedBy: {
                    connect: { id: userId }
                },
            },
            create: {
                cablesSalesArea,
                cablesBakery,
                cablesWarehouse,
                cablesBackoffice,
                speakersSalesArea,
                speakersBakery,
                speakersWarehouse,
                speakersBackoffice,
                status,
                storeId: {
                    connect: { id: storeId }
                },
                updatedBy: {
                    connect: { id: userId}
                },
            },
        });


        const updatedPhase1 = await prisma.phase1.findFirst({
            where: { store_id: storeId },
        });

        const user = await prisma.user.findUnique({
            where: { id: updatedPhase1?.updated_by },
            select: { name: true },
        });

        res.status(200).json({
            ...updatedPhase1,
            updated_by: updatedPhase1?.updated_by,
            updated_at: updatedPhase1?.updated_at,
            updatedByName: user?.name ?? 'Desconhecido',
        }); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar 1ª Fase' });
    }
};



exports.deletePhase1 = async (req, res) => {
    try {
        const { id } = req.params;
        const phase1Exist = await prisma.phase1.findUnique({
            where: { id: id },
        });
        if (!phase1Exist) {
            return res.status(404).json({ error: 'Phase1 not found' });
        }
        await prisma.phase1.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Phase1 deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
