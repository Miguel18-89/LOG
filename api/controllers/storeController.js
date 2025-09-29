const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createStore = async (req, res) => {
  try {
    const {
      storeName,
      storeNumber,
      storeAddress,
      storeRegion,
      storeArea,
      storeInspectorName,
      storeInspectorContact,
      userId,
    } = req.body;

    if (!storeName || !storeNumber || !userId) {
      return res.status(400).json('Name, number, and userId are required');
    }

    const storeNumberExist = await prisma.store.findUnique({
      where: { storeNumber: Number(storeNumber) },
    });

    if (storeNumberExist) {
      return res.status(409).json('Store already exists');
    }

    const newStore = await prisma.store.create({
      data: {
        storeName,
        storeNumber: Number(storeNumber),
        storeAddress,
        storeRegion,
        storeArea: storeArea ? Number(storeArea) : null,
        storeInspectorName,
        storeInspectorContact: storeInspectorContact ? Number(storeInspectorContact) : null,
        createdBy: {
          connect: { id: userId },
        },
      },
    });

    res.status(201).json({ message: 'Store created successfully', store: newStore });
  } catch (e) {
    console.error('Erro ao criar loja:', e);
    res.status(500).json('Something went wrong');
  }
};


exports.getAllStores = async (req, res) => {
    try {
        const allStores = await prisma.store.findMany();
        res.status(200).json({ allStores });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await prisma.store.findUnique({
            where: {
                id: id,
            },
        });
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.status(200).json({ store });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      storeName,
      storeNumber,
      storeAddress,
      storeRegion,
      storeArea,
      storeInspectorName,
      storeInspectorContact,
      userId
    } = req.body;

    const storeExist = await prisma.store.findUnique({
      where: { id },
    });

    if (!storeExist) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const updatedData = {};
    if (storeName) updatedData.storeName = storeName;
    if (storeNumber) updatedData.storeNumber = storeNumber;
    if (storeAddress) updatedData.storeAddress = storeAddress;
    if (storeRegion) updatedData.storeRegion = storeRegion;
    if (storeArea) updatedData.storeArea = storeArea;
    if (storeInspectorName) updatedData.storeInspectorName = storeInspectorName;
    if (storeInspectorContact) updatedData.storeInspectorContact = storeInspectorContact;
    if (userId) updatedData.updatedBy = { connect: { id: user.Id } };

    const updatedStore = await prisma.store.update({
      where: { id },
      data: updatedData,
    });

    res.status(200).json({ message: 'Store updated successfully', updatedStore });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
};


exports.deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        const storeExist = await prisma.store.findUnique({
            where: { id: id },
        });
        if (!storeExist) {
            return res.status(404).json({ error: 'Store not found' });
        }
        await prisma.store.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Store deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
