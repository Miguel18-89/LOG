const express = require('express')
const storeProvisioningRouter = express.Router();

const StoreProvisioningController = require("../controllers/storeProvisioningController");


storeProvisioningRouter.post('/', StoreProvisioningController.createStoreProvisioning);
storeProvisioningRouter.get('/', StoreProvisioningController.getAllProvisionings);
storeProvisioningRouter.get('/:id', StoreProvisioningController.getProvisioningById);
storeProvisioningRouter.get('/getProvisioningByStoreId', StoreProvisioningController.getProvisioningByStoreId);//Como saber que o ID é da loja e não do Provisioning??
storeProvisioningRouter.put('/:id', StoreProvisioningController.updateProvisioning);
storeProvisioningRouter.delete('/:id', StoreProvisioningController.deleteProvisioning);


module.exports = storeProvisioningRouter;

