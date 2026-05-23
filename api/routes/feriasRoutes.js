const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/feriasController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',          auth.requireAuthorization, ctrl.getAllVacations);
router.post('/',         auth.requireAuthorization, ctrl.createVacation);
router.put('/:id/status', auth.requireAuthorization, ctrl.updateStatus);
router.delete('/:id',    auth.requireAuthorization, ctrl.deleteVacation);

module.exports = router;
