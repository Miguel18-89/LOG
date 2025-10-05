const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.createStoreComment = async (req, res) => {
    try {
        const {
            message,
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

        const newComment = await prisma.comments.create({
            data: {
                message,
                status,
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
        res.status(500).json('Something went wrong');
    }
};

/*
exports.getAllComments = async (req, res) => {
    try {
        const allComments = await prisma.comments.findMany();
        res.status(200).json({ allComments });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}
*/

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
                    select: { name: true }, // opcional: inclui nome do autor
                },
            },
            orderBy: {
                created_at: 'asc', // opcional: ordena por data
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
        const { id } = req.params;
        const {
            message,
            updated,
        } = req.body;

        const updatedData = {
            message,
            updated: true,
        };

        const updatedComment = await prisma.comments.update({
            where: { id },
            data: updatedData,
        });

        res.status(200).json({ message: 'Comentário actualizado com sucesso', updatedComment });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Algo correu mal' });
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
