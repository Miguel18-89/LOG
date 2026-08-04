const express = require('express');
const hourBankRouter = express.Router();

const HourBankController = require('../controllers/hourBankController');
const authMiddleware = require('../middlewares/authAdminMiddleware');

hourBankRouter.get('/', authMiddleware.requireAuthorization, HourBankController.getBalance);
hourBankRouter.get('/mes', authMiddleware.requireAuthorization, HourBankController.getMonthSummary);
hourBankRouter.put('/taxa', authMiddleware.requireAuthorization, HourBankController.updateRate);
hourBankRouter.post('/ajuste', authMiddleware.requireAuthorization, HourBankController.createAdjustment);
hourBankRouter.post('/despesa', authMiddleware.requireAuthorization, HourBankController.createExpense);
hourBankRouter.post('/creditar', authMiddleware.requireAuthorization, HourBankController.creditFromOvertime);

module.exports = hourBankRouter;
