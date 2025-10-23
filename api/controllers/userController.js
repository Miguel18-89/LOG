const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { sendEmail } = require("../modules/email")

const prisma = new PrismaClient();

const { createUserSchema } = require('../schemas/userSchema');

exports.createUser = async (req, res) => {
    try {

        const parseResult = createUserSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: parseResult.error.format(),
            });
        }
        const { name, email, password } = parseResult.data;

        if (!name || !email || !password) {
            return res.status(400).json('Name, email and password are required');
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser && existingUser.is_active === true) {
            return res.status(409).json('Email already registered');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        if (existingUser && existingUser.is_active === false) {
            await prisma.user.update({
                where: { email },
                data: {
                    name,
                    password: hashedPassword,
                    role: 0,
                    is_active: true,
                    approved: false
                },
            });
        } else {
            await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 0,
                    is_active: true,
                    approved: false
                },
            });
        }

        await sendEmail(
            email,
            'Novo registo',
            'Registo efetuado com sucesso. Aguarda aprovação pelo administrador. Será notificado quando aprovado.'
        );

        const admins = await prisma.user.findMany({
            where: { role: 2 },
            select: { email: true },
        });

        await Promise.all(
            admins.map(admin =>
                sendEmail(admin.email, 'Novo utilizador registado', `Novo utilizador registado:\n\nNome: ${name}\nEmail: ${email}\n\nEstado: Pendente de aprovação.`)
            )
        );

        return res.status(201).json({ message: 'Utilizador criado ou reativado com sucesso. Emails enviados.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const rawSearch = req.query.search?.trim() || '';

        const whereAllUsers = {
            AND: [
                {
                    is_active: true,
                },
                rawSearch
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: rawSearch,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                email: {
                                    contains: rawSearch,
                                    mode: 'insensitive',
                                },
                            },
                        ].filter(Boolean),
                    }
                    : {},
            ],
        };

        const [allUsersRaw, total] = await Promise.all([
        prisma.user.findMany({
            where: whereAllUsers,
            skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { role: 'desc' },
        }),
        prisma.user.count({ where: whereAllUsers }),
        ])

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
            where: { id },
        });

        if (!userExist) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name && req.user.id !== id && req.user.role !== 2) {
            return res.status(403).json({
                error: 'Só o próprio utilizador ou um administrador pode alterar o nome.',
            });
        }

        const isTryingToChangeAdminStatus =
            userExist.role === 2 &&
            ((role !== undefined && role !== 2) || (approved !== undefined && !approved));

        if (isTryingToChangeAdminStatus) {
            const otherAdmins = await prisma.user.count({
                where: {
                    role: 2,
                    id: { not: id },
                    is_active: true,
                },
            });

            if (otherAdmins === 0) {
                return res.status(403).json({
                    error: 'Não é possível alterar o papel ou aprovação do único administrador ativo.',
                });
            }
        }

        const approvedUser = approved === true && userExist.approved === false;

        const updatedData = {};
        if (name) updatedData.name = name;
        if (role !== undefined) updatedData.role = role;
        if (approved !== undefined) updatedData.approved = approved;
        if (password) {
            const saltRounds = 10;
            updatedData.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updatedData,
        });

        if (approvedUser) {
            await sendEmail(
                updatedUser.email,
                'Conta aprovada',
                `Olá ${updatedUser.name},\n\nA sua conta foi aprovada pelo administrador e já pode aceder à plataforma LOG.\n\nCumprimentos,\nEquipa LOG`
            );
        }

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