const path = require('path');
const fs = require('fs');
const prisma = require('../../prisma/client');
const { documentMetadataSchema } = require('../schemas/documentsMetadataSchema');

exports.saveDocumentMetadata = async (req, res) => {
    try {
        console.log('req.body:', req.body); // debug
        console.log('req.file:', req.file); // debug

        const result = documentMetadataSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: result.error.format(),
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        const { uploaded_by, store_id } = result.data;

        const document = await prisma.documents.create({
            data: {
                filename: '',
                path: '',
                uploadedBy: {
                    connect: { id: uploaded_by },
                },
                storeId: {
                    connect: { id: store_id },
                },
            },
        });

        const fsPromises = require('fs/promises');

        const uuidFilename = `${document.id}.pdf`;
        const oldPath = path.resolve(req.file.path);
        const newPath = path.resolve(path.dirname(oldPath), uuidFilename);

        try {
            await fsPromises.rename(oldPath, newPath);
            console.log('Arquivo renomeado com sucesso:', newPath);
        } catch (err) {
            console.error('Erro ao renomear arquivo:', err);
        }

        const updatedDocument = await prisma.documents.update({
            where: { id: document.id },
            data: {
                filename: uuidFilename,
                path: newPath,
            },
        });

        console.log('Caminho original do arquivo:', req.file.path);

        res.status(201).json({
            message: 'Documento salvo com sucesso',
            document: updatedDocument,
        });
    } catch (error) {
        console.error('Erro ao salvar metadados:', error);
        res.status(500).json({ error: 'Erro interno ao salvar documento' });
    }
};

exports.getDocumentsByStore = async (req, res) => {


    const { storeId } = req.query;

    if (!storeId) {
        return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    try {
        const documents = await prisma.documents.findMany({
            where: {
                store_id: storeId, // ← campo escalar, não relacional
            },
            select: {
                id: true,
                filename: true,
                path: true,
                uploadedAt: true, // ✅ este é o campo de data que provavelmente queres
            }
            ,
        });



        res.status(200).json(documents);
    } catch (error) {
        console.error('Erro ao buscar documentos da loja:', error);
        res.status(500).json({ error: 'Erro interno ao buscar documentos' });
    }
};