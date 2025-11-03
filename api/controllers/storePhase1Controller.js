const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { createPhase1Schema } = require('../schemas/phase1Schema.js');

const { sendStorePhase1UpdateEmail } = require("../modules/email")



exports.createStorePhase1 = async (req, res) => {
    try {
        const parseResult = createPhase1Schema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

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
        } = parseResult.data;

        const storeIdExist = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeIdExist) {
            return res.status(404).json({ error: 'Store not found' });
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

        res.status(201).json({
            message: 'Phase1 created successfully',
            phase1: newPhase1,
        });
    } catch (e) {
        console.error('Erro ao criar a fase 1:', e);
        res.status(500).json({ error: e.message || 'Something went wrong' });
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
    const parseResult = createPhase1Schema.safeParse(req.body);

    const {id} = req.params;

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: parseResult.error.format(),
      });
    }

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
    } = parseResult.data;

    if (!storeId || !userId) {
      return res.status(400).json({ error: 'storeId e userId são obrigatórios' });
    }

    const phase1 = await prisma.phase1.upsert({
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
          connect: { id: userId },
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
          connect: { id: storeId },
        },
        updatedBy: {
          connect: { id: userId },
        },
      },
      include: {
        updatedBy: { select: { name: true } },
      },
    });

     const updatedPhase1 = await prisma.phase1.findUnique({
                where: { id },
                include: {
                    updatedBy: { select: { name: true } },
                    storeId: { select: { storeName: true, storeNumber: true } },
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
                    sendStorePhase1UpdateEmail(user.email, 'Actualização de loja', updatedPhase1)
                )
            );

    res.status(200).json({
      ...phase1,
      updatedByName: phase1.updatedBy?.name ?? 'Desconhecido',
    });
  } catch (error) {
    console.error('Erro ao processar 1ª Fase:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar 1ª Fase' });
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
