const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { createSurveySchema } = require('../schemas/surveySchema.js');

const { updateSurveySchema } = require('../schemas/surveySchema.js');

const { sendStoreSurveyUpdateEmail } = require("../modules/email")

exports.createStoreSurvey = async (req, res) => {
    try {
        const parseResult = createSurveySchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const {
            surveyHasFalseCeilling,
            surveyMetalFalseCeilling,
            surveyCheckoutCount,
            surveyHasElectronicGates,
            surveyArea,
            surveyPhase1Date,
            surveyPhase1Type,
            surveyPhase2Date,
            surveyPhase2Type,
            surveyOpeningDate,
            surveyHeadsets,
            surveyHasBread,
            surveyHasChicken,
            surveyHasCodfish,
            surveyHasNewOvens,
            status,
            storeId,
            userId,
        } = parseResult.data;

        const storeIdExist = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeIdExist) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        const newSurvey = await prisma.survey.create({
            data: {
                surveyHasFalseCeilling,
                surveyMetalFalseCeilling,
                surveyCheckoutCount,
                surveyHasElectronicGates,
                surveyArea,
                surveyPhase1Date,
                surveyPhase1Type,
                surveyPhase2Date,
                surveyPhase2Type,
                surveyOpeningDate,
                surveyHeadsets,
                surveyHasBread,
                surveyHasChicken,
                surveyHasCodfish,
                surveyHasNewOvens,
                status,
                storeId: { connect: { id: storeId } },
                updatedBy: { connect: { id: userId } },
            },
        });

        res.status(201).json({ message: 'Survey criado com sucesso', survey: newSurvey });
    } catch (e) {
        console.error('Erro ao criar survey:', e);
        res.status(500).json({ error: 'Algo correu mal' });
    }
};


exports.getAllSurveys = async (req, res) => {
    try {
        const allSurveys = await prisma.survey.findMany();
        res.status(200).json({ allSurveys });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getSurveyById = async (req, res) => {
    try {
        const { id } = req.params;
        const survey = await prisma.survey.findUnique({
            where: {
                id: id,
            },
        });
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.status(200).json({ survey });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getSurveyByStoreId = async (req, res) => {
    try {
        const { storeId } = req.body;
        const storeSurvey = await prisma.survey.findUnique({
            where: {
                storeId: storeId,
            },
        });
        if (!storeSurvey) {
            return res.status(404).json({ error: 'Store Survey not found' });
        }
        res.status(200).json({ storeSurvey });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.updateSurvey = async (req, res) => {
    try {
        const { id } = req.params;

        const parseResult = updateSurveySchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const {
            storeId,
            userId,
            surveyHasFalseCeilling,
            surveyMetalFalseCeilling,
            surveyCheckoutCount,
            surveyHasElectronicGates,
            surveyArea,
            surveyPhase1Date,
            surveyPhase1Type,
            surveyPhase2Date,
            surveyPhase2Type,
            surveyOpeningDate,
            surveyHeadsets,
            surveyHasBread,
            surveyHasChicken,
            surveyHasCodfish,
            surveyHasNewOvens,
            status,
        } = parseResult.data;

        const data = {
            surveyHasFalseCeilling,
            surveyMetalFalseCeilling,
            surveyCheckoutCount,
            surveyHasElectronicGates,
            surveyArea,
            surveyPhase1Date,
            surveyPhase1Type,
            surveyPhase2Date,
            surveyPhase2Type,
            surveyOpeningDate,
            surveyHeadsets,
            surveyHasBread,
            surveyHasChicken,
            surveyHasCodfish,
            surveyHasNewOvens,
            status,
            ...(storeId && { store_id: storeId }),
            updated_by: userId,
        };

        const surveyId = id || (
            storeId
                ? (await prisma.survey.findFirst({ where: { store_id: storeId } }))?.id
                : null
        );

        const result = await prisma.survey.upsert({
            where: { store_id: storeId },
            update: data,
            create: {
                ...data,
                store_id: storeId,
                updated_by: userId,
            },
        });

        const updatedSurvey = await prisma.survey.findUnique({
            where: { id: result.id },
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
                sendStoreSurveyUpdateEmail(user.email, 'Actualização de loja', updatedSurvey)
            )
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao atualizar survey:', error);
        res.status(500).json({ error: 'Erro ao processar survey' });
    }
};




exports.deleteSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const surveyExist = await prisma.survey.findUnique({
            where: { id: id },
        });
        if (!surveyExist) {
            return res.status(404).json({ error: 'Store not found' });
        }
        await prisma.survey.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Survey deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
