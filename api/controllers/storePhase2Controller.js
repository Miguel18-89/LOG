const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { createPhase2Schema } = require('../schemas/phase2Schema.js');

const { sendStorePhase2UpdateEmail } = require("../modules/email")

exports.createStorePhase2 = async (req, res) => {
    try {
        const parseResult = createPhase2Schema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

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
        } = parseResult.data;

        const storeIdExist = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeIdExist) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const phase2 = await prisma.phase2.create({
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

        res.status(200).json({
            message: 'Phase2 created or updated successfully',
            phase2,
            updatedByName: phase2.updatedBy?.name ?? 'Desconhecido',
        });
    } catch (e) {
        console.error('Erro ao criar ou atualizar a fase 2:', e);
        res.status(500).json({ error: e.message || 'Something went wrong' });
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
    const parseResult = createPhase2Schema.safeParse(req.body);
    const {id} = req.params;
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: parseResult.error.format(),
      });
    }

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
    } = parseResult.data;

    if (!storeId || !userId) {
      return res.status(400).json({ error: 'storeId e userId são obrigatórios' });
    }

    const phase2 = await prisma.phase2.upsert({
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
          connect: { id: userId },
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

    const updatedPhase2 = await prisma.phase2.findUnique({
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
                        sendStorePhase2UpdateEmail(user.email, 'Actualização de loja', updatedPhase2)
                    )
                );

    res.status(200).json({
      ...phase2,
      updatedByName: phase2.updatedBy?.name ?? 'Desconhecido',
    });
  } catch (error) {
    console.error('Erro ao processar 2ª Fase:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar 2ª Fase' });
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
