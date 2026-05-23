const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/frotaController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',    auth.requireAuthorization, ctrl.getAllVehicles);
router.post('/',   auth.requireAuthorization, ctrl.createVehicle);
router.get('/:id', auth.requireAuthorization, ctrl.getVehicleById);
router.put('/:id', auth.requireAuthorization, ctrl.updateVehicle);
router.delete('/:id', auth.requireAuthorization, ctrl.deleteVehicle);

router.post('/:id/tires',         auth.requireAuthorization, ctrl.addTireChange);
router.delete('/:id/tires/:rid',  auth.requireAuthorization, ctrl.deleteTireChange);

router.post('/:id/oil',           auth.requireAuthorization, ctrl.addOilChange);
router.delete('/:id/oil/:rid',    auth.requireAuthorization, ctrl.deleteOilChange);

router.post('/:id/repairs',          auth.requireAuthorization, ctrl.addRepair);
router.delete('/:id/repairs/:rid',   auth.requireAuthorization, ctrl.deleteRepair);

module.exports = router;
