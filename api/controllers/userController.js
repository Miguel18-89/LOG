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
        const allUsersRaw = await prisma.user.findMany();
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
        const { name, email, password, role } = req.body;
        const userExist = await prisma.user.findUnique({
            where: { id: id },
        });
        if (!userExist) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedData = {};
        if (name) updatedData.name = name;
        if (email) updatedData.email = email;
        if (role) updatedData.role = role;
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
