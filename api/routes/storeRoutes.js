const express = require('express')
const storeRouter = express.Router();

const StoreController = require("../controllers/storeController");


storeRouter.post('/', StoreController.createStore);
storeRouter.get('/', StoreController.getAllStores);
storeRouter.get('/:id', StoreController.getStoreById);
storeRouter.put('/:id', StoreController.updateStore);
storeRouter.delete('/:id', StoreController.deleteStore);


module.exports = storeRouter;

