const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { createStoreSchema } = require('../schemas/storeSchema.js');
const { updateStoreSchema } = require('../schemas/storeSchema.js');
const { sendStoreDetailsUpdateEmail } = require("../modules/email")





exports.createStore = async (req, res) => {
    try {
        const parseResult = createStoreSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const {
            storeName,
            storeNumber,
            storeAddress,
            storeRegion,
            storeInspectorName,
            storeInspectorContact,
            createdById,
        } = parseResult.data;

        const storeNumberExist = await prisma.store.findUnique({
            where: { storeNumber },
        });

        if (storeNumberExist) {
            return res.status(409).json({ error: 'O número de loja inserido já existe.' });
        }

        const userExists = await prisma.user.findUnique({
            where: { id: createdById },
        });

        if (!userExists) {
            return res.status(404).json({ error: 'Usuário não encontrado. Verifique o ID.' });
        }


        const newStore = await prisma.store.create({
            data: {
                storeName,
                storeNumber,
                storeAddress,
                storeRegion,
                storeInspectorName,
                storeInspectorContact,
                createdBy: { connect: { id: createdById } },
                updatedBy: { connect: { id: createdById } },
            },
        });

        res.status(201).json({ message: 'Loja criada com sucesso', store: newStore });
    } catch (e) {
        console.error('Erro ao criar loja:', e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getAllStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const rawSearch = req.query.search?.trim() || '';

        const whereClause = rawSearch
            ? {
                OR: [
                    { storeName: { contains: rawSearch, mode: 'insensitive' } },
                    {
                        storeNumber: {
                            in: await prisma.store.findMany({
                                select: { storeNumber: true },
                            }).then((stores) =>
                                stores
                                    .map((s) => s.storeNumber)
                                    .filter((num) => num.toString().includes(rawSearch))
                            ),
                        },
                    },
                ],
            }
            : {};


        const [allStores, total] = await Promise.all([
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
                orderBy: { storeNumber: 'asc' },
            }),
            prisma.store.count({ where: whereClause }),
        ]);

        res.status(200).json({ allStores, total });
    } catch (e) {
        console.error('Erro ao buscar lojas:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllCompletedStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const rawSearch = req.query.search?.trim() || '';

        const whereCompletedStores = {
            AND: [
                {
                    storePhase2: {
                        some: {
                            status: 2,
                        },
                    },
                },
                rawSearch
                    ? {
                        OR: [
                            {
                                storeName: {
                                    contains: rawSearch,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                storeNumber: {
                                    in: await prisma.store
                                        .findMany({ select: { storeNumber: true } })
                                        .then((stores) =>
                                            stores
                                                .map((s) => s.storeNumber)
                                                .filter((num) =>
                                                    num.toString().includes(rawSearch)
                                                )
                                        ),
                                },
                            },
                        ],
                    }
                    : {},
            ],
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
        const rawSearch = req.query.search?.trim() || '';

        const whereInProgressStores = {
            AND: [
                {
                    storePhase1: {
                        some: {
                            status: { in: [1, 2] },
                        },
                    },
                },
                {
                    storePhase2: {
                        every: {
                            status: { not: 2 },
                        },
                    },
                },
                rawSearch
                    ? {
                        OR: [
                            {
                                storeName: {
                                    contains: rawSearch,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                storeNumber: {
                                    in: await prisma.store
                                        .findMany({ select: { storeNumber: true } })
                                        .then((stores) =>
                                            stores
                                                .map((s) => s.storeNumber)
                                                .filter((num) =>
                                                    num.toString().includes(rawSearch)
                                                )
                                        ),
                                },
                            },
                        ],
                    }
                    : {},
            ],
        };

        const [allInProgressStores, total] = await Promise.all([
            prisma.store.findMany({
                where: whereInProgressStores,
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
                orderBy: { storeName: 'asc' },
            }),
            prisma.store.count({ where: whereInProgressStores }),
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
        const rawSearch = req.query.search?.trim() || '';

        const storeNumberMatches = rawSearch
            ? await prisma.store
                .findMany({ select: { storeNumber: true } })
                .then((stores) =>
                    stores
                        .map((s) => s.storeNumber)
                        .filter((num) => num.toString().includes(rawSearch))
                )
            : [];

        const whereUpCommingStores = {
            AND: [
                {
                    storePhase1: {
                        every: {
                            status: { notIn: [1, 2] },
                        },
                    },
                },
                {
                    storePhase2: {
                        every: {
                            status: { notIn: [1, 2] },
                        },
                    },
                },
                rawSearch
                    ? {
                        OR: [
                            {
                                storeName: {
                                    contains: rawSearch,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                storeNumber: {
                                    in: storeNumberMatches,
                                },
                            },
                        ],
                    }
                    : {},
            ],
        };

        const allStoresRaw = await prisma.store.findMany({
            where: whereUpCommingStores,
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
        });

        const sortedStores = allStoresRaw.sort((a, b) => {
            const aDate = a.storeSurveys[0]?.surveyOpeningDate ?? new Date(0);
            const bDate = b.storeSurveys[0]?.surveyOpeningDate ?? new Date(0);
            return aDate - bDate;
        });

        const paginatedStores = sortedStores.slice(
            (page - 1) * pageSize,
            page * pageSize
        );

        res.status(200).json({
            allUpCommingStores: paginatedStores,
            total: sortedStores.length,
        });
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

        const parseResult = updateStoreSchema.safeParse(req.body.formData);
        const { userId } = req.body;

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const {
            storeName,
            storeNumber,
            storeAddress,
            storeRegion,
            storeArea,
            storeInspectorName,
            storeInspectorContact,
        } = parseResult.data;

        const storeExist = await prisma.store.findUnique({ where: { id } });
        console.log("Store existente:", storeExist);
        if (!storeExist) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        const updatedData = {};
        if (storeName !== undefined) updatedData.storeName = storeName;
        if (storeNumber !== undefined) updatedData.storeNumber = storeNumber;
        if (storeAddress !== undefined) updatedData.storeAddress = storeAddress;
        if (storeRegion !== undefined) updatedData.storeRegion = storeRegion;
        if (storeArea !== undefined) updatedData.storeArea = storeArea;
        if (storeInspectorName !== undefined) updatedData.storeInspectorName = storeInspectorName;
        if (storeInspectorContact !== undefined) updatedData.storeInspectorContact = storeInspectorContact;

        if (userId) {
            updatedData.updatedBy = { connect: { id: userId } };
        }

        console.log("Dados a atualizar:", updatedData);


        await prisma.store.update({
            where: { id },
            data: updatedData,
        });

        const updatedStoreDetails = await prisma.store.findUnique({
            where: { id },
            include: {
                storeSurveys: true,
                storeProvisioning: true,
                storePhase1: true,
                storePhase2: true,
                createdBy: { select: { name: true } },
                updatedBy: { select: { name: true } },
            },
        });

        const allUsers = await prisma.user.findMany({
            where: {
                is_active: true,
                approved: true,
                role: { in: [0, 1] },
            },
            select: { email: true },
        });

        await Promise.all(
            allUsers.map(user =>
                sendStoreDetailsUpdateEmail(user.email, 'Actualização de loja', updatedStoreDetails)
            )
        );

        res.status(200).json({
            ...updatedStoreDetails,
            updatedByName: updatedStoreDetails?.updatedBy?.name || 'Desconhecido',
        });
    } catch (e) {
        console.error('Erro ao atualizar loja:', e);
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
