const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail, sendResetPasswordEmail } = require("../modules/email")

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;



exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password são obrigatórios.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'O seu registo aguarda aprovação. Contacte o administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password inválida.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { password: _pw, pin: _pin, resetToken: _rt, resetTokenExp: _rte, ...userSafe } = user;

    res.status(200).json({
      message: 'Login realizado com sucesso.',
      user: userSafe,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
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
      { id: user.id, email: user.email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
    await sendResetPasswordEmail(user.email, "Password Reset", resetToken, user.name);
    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.resetPassword = async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;

  if (!token) return res.status(400).json({ error: 'Token is required' });
  if (!password) return res.status(400).json({ error: 'New password is required' });

  try {

    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (payload.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token purpose' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User not found' });
    }

    // O token tem de corresponder ao último token de reset emitido para este utilizador e ainda
    // não pode ter expirado nem sido consumido — impede que um JWT de sessão normal (que nunca
    // tem este campo preenchido na BD) seja reutilizado como token de reset de password.
    if (!user.resetToken || user.resetToken !== token || !user.resetTokenExp || user.resetTokenExp.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const passwordChangedAt = new Date(Date.now() - 1000);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt,
          resetToken: null,
          resetTokenExp: null,
        },
      }),
    ]);

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

