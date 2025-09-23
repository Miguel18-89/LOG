const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require("../modules/email")

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;


exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User not found' });
    }
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    const resetURL = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;
    await sendEmail(user.email, "password Reset", `click here to reset your password: ${resetURL}`);
    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.resetPassword = async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'New password is required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.exp < Date.now() / 1000) {
      return res.status(400).json({ error: 'Token expired' });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User not found' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Invalid or expired token' });
  }
};
