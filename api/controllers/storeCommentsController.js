const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { commentsSchema } = require('../schemas/commentsSchema.js');

const { sendStoreCommentCreateEmail } = require("../modules/email")

const { sendStoreCommentUpdateEmail } = require("../modules/email")

exports.createStoreComment = async (req, res) => {
    try {

        const parseResult = commentsSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }

        const { storeId, message } = parseResult.data;
        const userId = req.user.id;

        if (!storeId) {
            return res.status(400).json('Store Id required');
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

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { storeName: true, storeNumber: true }
        });

        const userThatCreate = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
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
                sendStoreCommentCreateEmail(user.email, 'Actualização de loja', message, store, userThatCreate)
            )
        );

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

        const { message } = parseResult.data;

        const updatedData = {
            message,
            updated: true,
        };

        const comment = await prisma.comments.findUnique({
            where: {
                id: id,
            },
            include: {
                createdBy: { select: { name: true } },
                storeId: { select: { storeName: true, storeNumber: true } },
            },
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.created_by !== req.user.id) {
            return res.status(403).json({ error: "Only the creater of comment can edit" })
        }

        const updatedComment = await prisma.comments.update({
            where: { id },
            data: updatedData,
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
                sendStoreCommentUpdateEmail(user.email, 'Actualização de loja', comment, updatedComment)
            )
        );

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
        if (commentExist.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Only the creator of the comment can delete it' });
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
