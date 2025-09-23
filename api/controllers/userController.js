const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

exports.createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        res.status(201).json({ message: `New User created: ${JSON.stringify(newUser)}` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.getAllUsers = async (req, res) => {
    try {
        const allUsers = await prisma.user.findMany();
        res.status(200).json({ allUsers });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getUserById = async (req, res) => {
    try {
        const allUsers = await prisma.user.findMany();
        res.status(200).json({ allUsers });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({ user: userWithoutPassword });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;
        const userExist = await prisma.user.findUnique({
            where: { id: id },
        });
        if (!userExist) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedData = {};
        if (name) updatedData.name = name;
        if (email) updatedData.email = email;
        if (password) {
            const saltRounds = 10;
            updatedData.password = await bcrypt.hash(password, saltRounds);
        }
        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: updatedData,
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.status(200).json({ message: 'User updated successfully', user: userWithoutPassword });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userExist = await prisma.user.findUnique({
            where: { id: id },
        });
        if (!userExist) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: { is_active: false },
        });
        res.status(200).json({ message: 'User deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};










/*
const UserModel = require("../models/UserModel");

exports.getAllUsers = async (req, res, next) => {
    UserModel.find({})
        .then(user => {
            res.status(200).json({
                status: "Success",
                data: user
            });
        })
        .catch(err => {
            res.status(404).json({
                status: "fail",
                message: err.message
            });
        });
}



exports.updateUser = async (req, res) => {
    UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .then(user => {
            res.status(200).json({
                status: "updated",
                data: user
            })
        })
        .catch(err => {
            console.log(err)
            res.status(400).json({
                status: "Não encontrado",
                message: err
            })
        })
}

exports.getUserById = async (req, res) => {
    UserModel.findById(req.params.id)
        .then(user => {
            res.status(200).json(user);
        })
        .catch(err => {
            res.status(404).json({
                status: "Não encontrado",
            })
        })
}


exports.deleteUser = async (req, res) => {
    UserModel.findByIdAndDelete(req.params.id)
        .then(user => {
            res.status(200).json({
                status: "Success",
                data: null
            })
        })
        .catch(err => {
            res.status(404).json({
                status: "Não encontrado3",
                message: err
            })
        })
}
*/