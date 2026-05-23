const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rmaController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',        auth.requireAuthorization, ctrl.getAllRMAs);
router.post('/',       auth.requireAuthorization, ctrl.createRMA);
router.get('/:id',     auth.requireAuthorization, ctrl.getRMAById);
router.put('/:id',     auth.requireAuthorization, ctrl.updateRMA);
router.delete('/:id',  auth.requireAuthorization, ctrl.deleteRMA);
router.post('/:id/updates', auth.requireAuthorization, ctrl.addUpdate);

module.exports = router;
