const express = require('express');
const overtimeRouter = express.Router();

const OvertimeController = require('../controllers/overtimeController');
const authMiddleware = require('../middlewares/authAdminMiddleware');

overtimeRouter.post('/public', OvertimeController.publicCreateOvertime);
overtimeRouter.post('/', authMiddleware.requireAuthorization, OvertimeController.createOvertime);
overtimeRouter.post('/ferias', authMiddleware.requireAuthorization, OvertimeController.createVacationPeriod);
overtimeRouter.post('/enviar', authMiddleware.requireAuthorization, OvertimeController.sendOvertimeEmail);
overtimeRouter.get('/', authMiddleware.requireAuthorization, OvertimeController.getAllOvertime);
overtimeRouter.get('/:id', authMiddleware.requireAuthorization, OvertimeController.getOvertimeById);
overtimeRouter.put('/:id', authMiddleware.requireAuthorization, OvertimeController.updateOvertime);
overtimeRouter.delete('/:id', authMiddleware.requireAuthorization, OvertimeController.deleteOvertime);

module.exports = overtimeRouter;
