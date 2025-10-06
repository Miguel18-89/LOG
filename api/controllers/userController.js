const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

exports.createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json('Name, email and password are required');
        }
        const emailExist = await prisma.user.findUnique({
            where: { email: email },
        });
        if (emailExist) {
            res.status(500).json('Email already registered');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        res.status(201).json("User created successfully");
    } catch (e) {
        console.error(e);
        res.status(500).json('Something went wrong');
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const allUsersRaw = await prisma.user.findMany({
            where: {
                is_active: true,
            },
        });

        const allUsers = allUsersRaw.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
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
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                approved: true
            },
        });

        if (!user) {
            return res.status(404).json({ name: 'Desconhecido' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ name: 'Desconhecido' });
    }
};


exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, approved } = req.body;

        const userExist = await prisma.user.findUnique({
            where: { id: id },
        });

        if (!userExist) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isRemovingAdmin = userExist.role === 2 && role !== 2;

        if (isRemovingAdmin) {
            const otherAdmins = await prisma.user.count({
                where: {
                    role: 2,
                    id: { not: id } ,
                    is_active: true, // se usares este campo
                },
            });

            if (otherAdmins === 0) {
                return res.status(403).json({
                    error: 'Não é possível remover o único administrador ativo.',
                });
            }
        }

        const updatedData = {};
        if (name) updatedData.name = name;
        if (email) updatedData.email = email;
        if (role !== undefined) updatedData.role = role;
        if (approved !== undefined) updatedData.approved = approved;
        if (password) {
            const saltRounds = 10;
            updatedData.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: updatedData,
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.status(200).json({
            message: 'User updated successfully',
            user: userWithoutPassword,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};



exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id: id } });

        if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

        if (user.role === 2) {
            const otherAdmins = await prisma.user.count({
                where: {
                    role: 2,
                    id: { not: id },
                },
            });

            if (otherAdmins === 0) {
                return res.status(403).json({ error: 'Não é possível apagar o único administrador.' });
            }
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