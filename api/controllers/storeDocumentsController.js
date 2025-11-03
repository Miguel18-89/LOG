const path = require('path');
const fs = require('fs/promises');
const prisma = require('../../prisma/client');
const { documentMetadataSchema } = require('../schemas/documentsMetadataSchema');

exports.saveDocumentMetadata = async (req, res) => {
    try {

        const result = documentMetadataSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: result.error.format(),
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum ficheiro foi enviado' });
        }

        const { uploaded_by, store_id } = result.data;

        const fixEncoding = (str) => Buffer.from(str, 'latin1').toString('utf8');
        const originalName = fixEncoding(req.file.originalname);
        console.log(originalName)


        const document = await prisma.documents.create({
            data: {
                filename: '',
                path: '',
                originalName: originalName,
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
            console.log('Ficheiro renomeado com sucesso:', newPath);
        } catch (err) {
            console.error('Erro ao renomear o ficheiro:', err);
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
    try {
        const { storeId } = req.params;
        const documents = await prisma.documents.findMany({
            where: { store_id: storeId },
            select: { id: true, filename: true, uploadedAt: true, originalName: true }
        });

        res.json(documents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao procurar documentos' });
    }
};


exports.getDocumentsById = async (req, res) => {
    try {
        const doc = await prisma.documents.findUnique({
            where: { id: req.params.id }
        });

        if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
        res.type('application/pdf');
        res.sendFile(path.resolve(doc.path)); // devolve o PDF
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar documento' });
    }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)

    const document = await prisma.documents.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    try {
      await fs.unlink(document.path);
      console.log('Ficheiro apagado:', document.path);
    } catch (err) {
      console.warn('Aviso: não foi possível apagar o ficheiro físico', err.message);
    }

    await prisma.documents.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Documento apagado com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar documento:', error);
    res.status(500).json({ error: 'Erro interno ao apagar documento' });
  }
};
