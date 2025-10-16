const express = require('express')
const storeSurveyRouter = express.Router();

const StoreSurveyController = require("../controllers/storeSurveyController");

const authMiddleware = require("../middlewares/authAdminMiddleware");


storeSurveyRouter.post('/', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreSurveyController.createStoreSurvey);
storeSurveyRouter.get('/', authMiddleware.requireAuthorization, StoreSurveyController.getAllSurveys);
storeSurveyRouter.get('/:id', authMiddleware.requireAuthorization, StoreSurveyController.getSurveyById);
storeSurveyRouter.get('/getSurveyByStoreId', authMiddleware.requireAuthorization, StoreSurveyController.getSurveyByStoreId);//Como saber que o ID é da loja e não do Survey??
storeSurveyRouter.put('/:id', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreSurveyController.updateSurvey);
storeSurveyRouter.delete('/:id', authMiddleware.requireAuthorization, authMiddleware.isManager, StoreSurveyController.deleteSurvey);


module.exports = storeSurveyRouter;

