const express = require('express');
const userRouter = express.Router();

const UserController = require("../controllers/userController");
const authController = require("../controllers/authController");
const auth = require("../middlewares/authAdminMiddleware");

// Public routes
userRouter.post('/login', authController.login);
userRouter.post('/forgot-password', authController.forgotPassword);
userRouter.put('/reset-password/:token', authController.resetPassword);
userRouter.post('/', UserController.createUser); // self-registration

// Protected routes
userRouter.get('/', auth.requireAuthorization, auth.requireAdmin, UserController.getAllUsers);
userRouter.get('/:id', auth.requireAuthorization, UserController.getUserById);
userRouter.put('/:id', auth.requireAuthorization, UserController.updateUser);
userRouter.delete('/:id', auth.requireAuthorization, auth.requireAdmin, UserController.deleteUser);

module.exports = userRouter;

