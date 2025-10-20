const express = require('express')
const storePhase2Router = express.Router();

const StorePhase2Controller = require("../controllers/storePhase2Controller");

const authMiddleware = require("../middlewares/authAdminMiddleware");

storePhase2Router.post('/', authMiddleware.requireAuthorization, StorePhase2Controller.createStorePhase2);
storePhase2Router.get('/', StorePhase2Controller.getAllPhase2s);
storePhase2Router.get('/:id', StorePhase2Controller.getPhase2ById);
//storePhase2Router.get('/getPhase2ByStoreId', authMiddleware.requireAuthorization, StorePhase2Controller.getPhase2ByStoreId);//Como saber que o ID é da loja e não do Phase2??
storePhase2Router.put('/:id', authMiddleware.requireAuthorization, authMiddleware.isNotManager, StorePhase2Controller.updatePhase2);
storePhase2Router.delete('/:id', authMiddleware.requireAuthorization, StorePhase2Controller.deletePhase2);


module.exports = storePhase2Router;

