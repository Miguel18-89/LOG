const express = require('express')
const storeProvisioningRouter = express.Router();

const StoreProvisioningController = require("../controllers/storeProvisioningController");

const authMiddleware = require("../middlewares/authAdminMiddleware");

storeProvisioningRouter.post('/', authMiddleware.requireAuthorization, StoreProvisioningController.createStoreProvisioning);
storeProvisioningRouter.get('/', StoreProvisioningController.getAllProvisionings);
storeProvisioningRouter.get('/:id', StoreProvisioningController.getProvisioningById);
storeProvisioningRouter.put('/:id', authMiddleware.requireAuthorization, StoreProvisioningController.updateProvisioning);
storeProvisioningRouter.delete('/:id', authMiddleware.requireAuthorization, StoreProvisioningController.deleteProvisioning);


module.exports = storeProvisioningRouter;

