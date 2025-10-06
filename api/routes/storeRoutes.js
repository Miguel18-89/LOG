const express = require('express')
const storeRouter = express.Router();

const StoreController = require("../controllers/storeController");

const authMiddleware = require("../middlewares/authAdminMiddleware");


storeRouter.post('/', StoreController.createStore);
storeRouter.get('/completed', StoreController.getAllCompletedStores);
storeRouter.get('/InProgress', StoreController.getAllInProgressStores);
storeRouter.get('/UpComming', StoreController.getAllUpCommingStores);
storeRouter.get('/', StoreController.getAllStores);
storeRouter.get('/:id', StoreController.getStoreById);
storeRouter.put('/:id', StoreController.updateStore);
storeRouter.delete('/:id', StoreController.deleteStore);


module.exports = storeRouter;

//authMiddleware.isAdmin, 