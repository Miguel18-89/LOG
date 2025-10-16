const express = require('express')
const storeCommentRouter = express.Router();

const StoreCommentController = require("../controllers/storeCommentsController");

const authMiddleware = require("../middlewares/authAdminMiddleware");

storeCommentRouter.post('/', authMiddleware.requireAuthorization, StoreCommentController.createStoreComment);
//storeCommentRouter.get('/', authMiddleware.requireAuthorization, StoreCommentController.getAllComments);
storeCommentRouter.get('/:id', authMiddleware.requireAuthorization, StoreCommentController.getCommentById);
storeCommentRouter.get('/', authMiddleware.requireAuthorization, StoreCommentController.getCommentByStoreId);//Como saber que o ID é da loja e não do Comment??
storeCommentRouter.put('/:id', authMiddleware.requireAuthorization, StoreCommentController.updateComment);
storeCommentRouter.delete('/:id', authMiddleware.requireAuthorization, StoreCommentController.deleteComment);


module.exports = storeCommentRouter;

