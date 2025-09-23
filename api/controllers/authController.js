const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail} = require("../modules/email")

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

    // Gera o token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove a senha da resposta
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

    // Gera token JWT com validade curta (ex: 15 min)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Salva o token e validade no banco (opcional)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
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

    // Verifica se o token expirou
    if (payload.exp < Date.now() / 1000) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Busca o utilizador
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Encripta a nova senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Atualiza a senha
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






/*

const jwt = require("jsonwebtoken")
const UserModel = require("../models/UserModel");
const { sendEmail} = require("../modules/email")
/*
exports.signup = async (req, res) => {
    var newUser = new UserModel({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        photo: req.body.photo
    });
    newUser.save()
        .then(user => {
            user.password = undefined;
            //res.status(201).json(user)
            sendAuth(res, user);
        })
        .catch(err => {
            res.status(400).json({ error: err.message });
        })
};

const signToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
}

const sendAuth = (res, user) => {
    var token = signToken(user);
    res.status(200).json({ token, user });
}


exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password required" });
    }

    UserModel.findOne({ email: email })
        .then(async (user) => {
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const isMatch = await user.comparePassowrd(password);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid Password" });
            }

            user.password = undefined;

            sendAuth(res, user);
        })
        .catch((err) => {
            console.log(err)
            res.status(500).json({ error: "Internal server error" })
        })
}

exports.forgotPassword = async (req, res) => {
    const {email} = req.body;
    if(!email){
        return res.status(400).json({error: "Email is required"})
    }

    const user = await UserModel.findOne({email: email});
    if(!user){
        return res.status(404).json({error: "user not found"});
    }

    const resetToken = signToken(user);
    const resetURL = `${req.protocol}://${req.get("host")}/api/users/reset-password${resetToken}`;
    await sendEmail(user.email, "password Reset", `click here to reset your password: ${resetURL}`);
    return res.status(200).json({message: "Password reset email sent"});
}

exports.resetPassword = async (req, res)=>{
    const token = req.params.token;
    if(!token){
        return res.status(400).json({error: "token is required"});
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if(payload.exp < Date.now()/1000){
        return res.status(400).json[{error: "token expired"}]
    }

    const user = await UserModel.findById(payload.id);
    if(!user){
        return res.status(404).json({error: "user not found"});
    }

    user.password = req.body.password;
    await user.save();
    res.status(200).json({message: "password reset sucessfull"})
}


*/