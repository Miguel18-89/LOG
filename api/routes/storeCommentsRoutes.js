const express = require('express')
const storeCommentRouter = express.Router();

const StoreCommentController = require("../controllers/storeCommentsController");


storeCommentRouter.post('/', StoreCommentController.createStoreComment);
//storeCommentRouter.get('/', StoreCommentController.getAllComments);
storeCommentRouter.get('/:id', StoreCommentController.getCommentById);
storeCommentRouter.get('/', StoreCommentController.getCommentByStoreId);//Como saber que o ID é da loja e não do Comment??
storeCommentRouter.put('/:id', StoreCommentController.updateComment);
storeCommentRouter.delete('/:id', StoreCommentController.deleteComment);


module.exports = storeCommentRouter;

