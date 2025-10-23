const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { commentsSchema } = require('../schemas/commentsSchema.js');


exports.createStoreComment = async (req, res) => {
    try {

        const parseResult = commentsSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const { storeId, userId, message } = parseResult.data;


        if (!storeId || !userId) {
            return res.status(400).json('Store Id and User Id required');
        }

        const storeIdExist = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeIdExist) {
            return res.status(404).json('Store not found');
        }

        const newComment = await prisma.comments.create({
            data: {
                message,
                createdBy: {
                    connect: { id: userId },
                },
                storeId: {
                    connect: { id: storeId },
                },
            },
        });

        res.status(201).json({ message: 'Comment created successfully', comment: newComment });
    } catch (e) {
        console.error('Erro ao criar comentário:', e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getCommentById = async (req, res) => {
    try {
        const { id } = req.params;
        const comment = await prisma.comments.findUnique({
            where: {
                id: id,
            },
        });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.status(200).json({ comment });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getCommentByStoreId = async (req, res) => {
    try {
        const { storeId } = req.query;


        if (!storeId) {
            return res.status(400).json({ error: 'storeId é obrigatório' });
        }

        const storeComments = await prisma.comments.findMany({
            where: {
                storeId: {
                    id: storeId,
                },
            },

            include: {
                createdBy: {
                    select: { name: true },
                },
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        res.status(200).json(storeComments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao buscar comentários da loja' });
    }
};

exports.updateComment = async (req, res) => {
    try {

        const parseResult = commentsSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }


        const { id } = req.params;

        const {
            message,
            updated, userId
        } = parseResult.data;

        const updatedData = {
            message,
            updated: true,
        };

        const comment = await prisma.comments.findUnique({
            where: {
                id: id,
            },
        });

        if (comment.created_by !== userId) {
            return res.status(403).json({ error: "Only the creater of comment can edit" })
        }

        const updatedComment = await prisma.comments.update({
            where: { id },
            data: updatedData,
        });

        res.status(200).json({ message: 'Comentário actualizado com sucesso', updatedComment });
    } catch (e) {
        console.error("Erro ao editar o comentário", e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const commentExist = await prisma.comments.findUnique({
            where: { id: id },
        });
        if (!commentExist) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        await prisma.comments.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'comment deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
