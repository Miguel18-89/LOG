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
                updatedBy: {
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
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const [allStores, total] = await Promise.all([
            prisma.store.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    storeSurveys: {
                    select: {
                        status: true,
                        surveyOpeningDate: true, 
                    },
                },
                    storeProvisioning: { select: { status: true } },
                    storePhase1: { select: { status: true } },
                    storePhase2: { select: { status: true } },
                },
                orderBy: { storeNumber: 'asc' },
            }),
            prisma.store.count(),
        ]);

        res.status(200).json({ allStores, total });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllCompletedStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const whereCompletedStores = {
            storePhase2: {
                some: {
                    status: 2,
                },
            },
        };

        const [allCompletedStores, total] = await Promise.all([
            prisma.store.findMany({
                where: whereCompletedStores,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    storeSurveys: {
                    select: {
                        status: true,
                        surveyOpeningDate: true, 
                    },
                },
                    storeProvisioning: { select: { status: true } },
                    storePhase1: { select: { status: true } },
                    storePhase2: { select: { status: true } },
                },
                orderBy: { storeNumber: 'asc' },
            }),
            prisma.store.count({ where: whereCompletedStores }),
        ]);

        res.status(200).json({ allCompletedStores, total });
    } catch (error) {
        console.error('Erro ao buscar lojas concluídas:', error);
        res.status(500).json({ error: 'Erro ao buscar lojas concluídas' });
    }
};

exports.getAllInProgressStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const whereClause = {
            storePhase1: {
                some: {
                    status: { in: [1, 2] },
                },
            },
            storePhase2: {
                every: {
                    status: { not: 2 },
                },
            },
        };

        const [allInProgressStores, total] = await Promise.all([
            prisma.store.findMany({
                where: whereClause,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    storeSurveys: {
                    select: {
                        status: true,
                        surveyOpeningDate: true, 
                    },
                },
                    storeProvisioning: { select: { status: true } },
                    storePhase1: { select: { status: true } },
                    storePhase2: { select: { status: true } },
                },
                orderBy: { storeName: 'asc' }, // opcional
            }),
            prisma.store.count({ where: whereClause }),
        ]);

        res.status(200).json({ allInProgressStores, total });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllUpCommingStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const whereUpCommingStores = {
            storePhase1: {
                every: {
                    status: { notIn: [1, 2] },
                },
            },
            storePhase2: {
                every: {
                    status: { notIn: [1, 2] },
                },
            },
        };

        const [allUpCommingStores, total] = await Promise.all([
        prisma.store.findMany({
            where: whereUpCommingStores,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                storeSurveys: {
                    select: {
                        status: true,
                        surveyOpeningDate: true, 
                    },
                },
                storeProvisioning: { select: { status: true } },
                storePhase1: { select: { status: true } },
                storePhase2: { select: { status: true } },
            },
        }),
        prisma.store.count({ where: whereUpCommingStores }),
        ]);

        res.status(200).json({ allUpCommingStores, total });
    } catch (error) {
        console.error('Erro ao buscar lojas futuras:', error);
        res.status(500).json({ error: 'Erro ao buscar lojas futuras' });
    }
};



exports.getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await prisma.store.findUnique({
            where: { id },
            include: {
                storeSurveys: true,
                storeProvisioning: true,
                storePhase1: true,
                storePhase2: true,
                createdBy: {
                    select: { name: true }
                },
                updatedBy: {
                    select: { name: true }
                }

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

        const updatedStoreDetails = await prisma.store.findFirst({
            where: { id },
            include: {
                storeSurveys: true,
                storeProvisioning: true,
                storePhase1: true,
                storePhase2: true,
                createdBy: {
                    select: { name: true }
                },
                updatedBy: {
                    select: { name: true }
                }
            }
        });

        const user = await prisma.user.findUnique({
            where: { id: updatedStoreDetails?.updated_by },
            select: { name: true },
        });

        res.status(200).json({
            ...updatedStoreDetails,
            updated_by: user,
            updated_at: updatedStoreDetails?.updated_at,
            updatedByName: user?.name ?? 'Desconhecido',
        });

        res.status(200).json(updatedStoreDetails);
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
