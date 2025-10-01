const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createStoreSurvey = async (req, res) => {
    try {
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

        const newSurvey = await prisma.survey.create({
            data: {
                surveyHasFalseCeilling,
                surveyMetalFalseCeilling,
                surveyCheckoutCount,
                surveyHasElectronicGates,
                surveyArea: surveyArea ? Number(surveyArea) : null,
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
                storeId,
                updatedBy: {
                    connect: { id: userId },
                },
                storeId: {
                    connect: { id: storeId },
                },
            },
        });

        res.status(201).json({ message: 'Survey created successfully', survey: newSurvey });
    } catch (e) {
        console.error('Erro ao criar loja:', e);
        res.status(500).json('Something went wrong');
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
        } = req.body;

        const data = {
            surveyHasFalseCeilling,
            surveyMetalFalseCeilling,
            surveyCheckoutCount,
            surveyHasElectronicGates,
            surveyArea,
            surveyPhase1Date: surveyPhase1Date ? new Date(surveyPhase1Date) : null,
            surveyPhase1Type,
            surveyPhase2Date: surveyPhase2Date ? new Date(surveyPhase2Date) : null,
            surveyPhase2Type,
            surveyOpeningDate: surveyOpeningDate ? new Date(surveyOpeningDate) : null,
            surveyHeadsets,
            surveyHasBread,
            surveyHasChicken,
            surveyHasCodfish,
            surveyHasNewOvens,
            status,
            ...(storeId && { store_id: storeId }),
            ...(userId && { updatedBy: { connect: { id: userId } } })

        };

        let surveyId = id;

        if (!surveyId) {
            console.log(storeId)
            const existingSurvey = await prisma.survey.findFirst({
                where: { store_id: storeId },
            });
            if (existingSurvey) {
                surveyId = existingSurvey.id;
            }
        }

        let result;
        if (surveyId) {
            result = await prisma.survey.update({
                where: { id: surveyId },
                data,
            });
        } else {
            console.log(data)
            result = await prisma.survey.create({ data });
        }

        res.status(200).json({
            message: 'Survey atualizado com sucesso',
            survey: result,
        });
    } catch (error) {
        console.error(error);
        console.log(error)
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
