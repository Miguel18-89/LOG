const express = require('express')
const storePhase1Router = express.Router();

const StorePhase1Controller = require("../controllers/storePhase1Controller");

const authMiddleware = require("../middlewares/authAdminMiddleware");

storePhase1Router.post('/', authMiddleware.requireAuthorization, StorePhase1Controller.createStorePhase1);
storePhase1Router.get('/', StorePhase1Controller.getAllPhase1s);
storePhase1Router.get('/:id', StorePhase1Controller.getPhase1ById);
//storePhase1Router.get('/getPhase1ByStoreId', StorePhase1Controller.getPhase1ByStoreId);//Como saber que o ID é da loja e não do Phase1??
storePhase1Router.put('/:id', authMiddleware.requireAuthorization, authMiddleware.isNotManager, StorePhase1Controller.updatePhase1);
storePhase1Router.delete('/:id', authMiddleware.requireAuthorization, StorePhase1Controller.deletePhase1);


module.exports = storePhase1Router;

