const express = require('express')
const userRouter = express.Router();

const UserController = require("../controllers/userController");
const authController = require("../controllers/authController");

userRouter.post('/', UserController.createUser);
userRouter.get('/', UserController.getAllUsers);
userRouter.get('/:id', UserController.getUserById);
userRouter.put('/:id', UserController.updateUser);
userRouter.delete('/:id', UserController.deleteUser);
userRouter.post("/login", authController.login);
userRouter.post("/forgot-password", authController.forgotPassword);
userRouter.put("/reset-password/:token", authController.resetPassword)

module.exports = userRouter;

