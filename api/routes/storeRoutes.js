const express = require('express')
const storeRouter = express.Router();

const StoreController = require("../controllers/storeController");

const authMiddleware = require("../middlewares/authAdminMiddleware");


storeRouter.post('/', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreController.createStore);
storeRouter.get('/completed', authMiddleware.requireAuthorization, StoreController.getAllCompletedStores);
storeRouter.get('/InProgress', authMiddleware.requireAuthorization, StoreController.getAllInProgressStores);
storeRouter.get('/UpComming', authMiddleware.requireAuthorization, StoreController.getAllUpCommingStores);
storeRouter.get('/', authMiddleware.requireAuthorization, StoreController.getAllStores);
storeRouter.get('/:id', authMiddleware.requireAuthorization, StoreController.getStoreById);
storeRouter.put('/:id', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreController.updateStore);
storeRouter.delete('/:id', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreController.deleteStore);


module.exports = storeRouter;
