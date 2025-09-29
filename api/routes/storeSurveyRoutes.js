const express = require('express')
const storeSurveyRouter = express.Router();

const StoreSurveyController = require("../controllers/storeSurveyController");


storeSurveyRouter.post('/', StoreSurveyController.createStoreSurvey);
storeSurveyRouter.get('/', StoreSurveyController.getAllSurveys);
storeSurveyRouter.get('/:id', StoreSurveyController.getSurveyById);
storeSurveyRouter.get('/getSurveyByStoreId', StoreSurveyController.getSurveyByStoreId);//Como saber que o ID é da loja e não do Survey??
storeSurveyRouter.put('/:id', StoreSurveyController.updateSurvey);
storeSurveyRouter.delete('/:id', StoreSurveyController.deleteSurvey);


module.exports = storeSurveyRouter;

