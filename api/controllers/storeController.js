const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createStore = async (req, res) => {
    try {
        const {
            storeName,
            storeNumber,
            storeAddress,
            storeRegion,
            storeInspectorName,
            storeInspectorContact,
            userId
        } = req.body;

        if (!storeName || !storeNumber || !userId) {
            return res.status(400).json('Name, number, and userId are required');
        }

        const storeNumberExist = await prisma.store.findUnique({
            where: { storeNumber: Number(storeNumber) },
        });

        if (storeNumberExist) {
            return res.status(409).json('O número de loja iserido já existe.');
        }

        const newStore = await prisma.store.create({
            data: {
                storeName,
                storeNumber: Number(storeNumber),
                storeAddress,
                storeRegion,
                storeInspectorName,
                storeInspectorContact: storeInspectorContact ? Number(storeInspectorContact) : null,
                createdBy: {
                    connect: { id: userId },
                },
            },
        });

        res.status(201).json({ message: 'Loja criada com sucesso', store: newStore });
    } catch (e) {
        console.error('Erro ao criar loja:', e);
        res.status(500).json('Algo correu mal.');
    }
};


exports.getAllStores = async (req, res) => {
    try {
        const allStores = await prisma.store.findMany();
        res.status(200).json({ allStores });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
}


exports.getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await prisma.store.findUnique({
            where: { id },
            include: {
                storeSurveys: true,
                storeProvisioning: true,
            },
        });

        if (!store) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        res.status(200).json(store);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};


exports.updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            storeName,
            storeNumber,
            storeAddress,
            storeRegion,
            storeArea,
            storeInspectorName,
            storeInspectorContact,
            userId
        } = req.body;

        const storeExist = await prisma.store.findUnique({
            where: { id },
        });

        if (!storeExist) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        const updatedData = {};
        if (storeName) updatedData.storeName = storeName;
        if (storeNumber) updatedData.storeNumber = storeNumber;
        if (storeAddress) updatedData.storeAddress = storeAddress;
        if (storeRegion) updatedData.storeRegion = storeRegion;
        if (storeArea) updatedData.storeArea = storeArea;
        if (storeInspectorName) updatedData.storeInspectorName = storeInspectorName;
        if (storeInspectorContact) updatedData.storeInspectorContact = storeInspectorContact;
        if (userId) updatedData.updatedBy = { connect: { id: user.Id } };

        const updatedStore = await prisma.store.update({
            where: { id },
            data: updatedData,
        });

        res.status(200).json({ message: 'Loja actualizada com sucesso', updatedStore });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};


exports.deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        const storeExist = await prisma.store.findUnique({
            where: { id: id },
        });
        if (!storeExist) {
            return res.status(404).json({ error: 'Loja não encontrada.' });
        }
        await prisma.store.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Loja apagada com sucesso.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};
