const express = require('express')
const storeCommentRouter = express.Router();

const StoreCommentController = require("../controllers/storeCommentsController");

const authMiddleware = require("../middlewares/authAdminMiddleware");

storeCommentRouter.post('/', authMiddleware.requireAuthorization, StoreCommentController.createStoreComment);
storeCommentRouter.get('/:id', authMiddleware.requireAuthorization, StoreCommentController.getCommentById);
storeCommentRouter.get('/', authMiddleware.requireAuthorization, StoreCommentController.getCommentByStoreId);
storeCommentRouter.put('/:id', authMiddleware.requireAuthorization, StoreCommentController.updateComment);
storeCommentRouter.delete('/:id', authMiddleware.requireAuthorization, StoreCommentController.deleteComment);


module.exports = storeCommentRouter;

