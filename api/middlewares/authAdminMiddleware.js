const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.requireAuthorization = async (req, res, next) => {
    try {
        let tokenParts = req.headers.authorization?.split(" ") ?? [];

        if (tokenParts.length !== 2 || tokenParts[0] != "Bearer") {
            return res.status(401).json({ error: "unauthorized1" });
        }

        const token = tokenParts[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET);


        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });
        if (!user) {
            return res.status(401).json({ error: "unauthorized2" })
        }

        if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
            return res.status(498).json({ error: "Token expirado após alteração de senha" });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error" })
    }
}


exports.isAdmin = async (req, res, next) => {
    const tokenParts = req.headers.authorization?.split(" ") ?? [];

    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res.status(401).json({ error: "unauthorized" });
    }

    const token = tokenParts[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            return res.status(401).json("Sem sessão iniciada, por favor faça login");
        }

        if (user.role !== 2) {
            return res.status(403).json("Não autorizado, contacte o Administrador");
        }

        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json("A verificação do utilizador falhou, por favor contacte o Administrador");
    }
};

exports.isManager = async (req, res, next) => {
    const tokenParts = req.headers.authorization?.split(" ") ?? [];
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res.status(401).json({ error: "unauthorized" });
    }

    const token = tokenParts[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            return res.status(401).json("Sem sessão iniciada, por favor faça login");
        }

        if (user.role !== 2 && user.role !== 1) {
            return res.status(403).json("Não autorizado, contacte o Administrador");
        }

        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json("A verificação do utilizador falhou, por favor contacte o Administrador");
    }
};

exports.isNotManager = async (req, res, next) => {
    const tokenParts = req.headers.authorization?.split(" ") ?? [];
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res.status(401).json({ error: "unauthorized" });
    }

    const token = tokenParts[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            return res.status(401).json("Sem sessão iniciada, por favor faça login");
        }

        if (user.role !== 2 && user.role !== 0) {
            return res.status(403).json("Não autorizado, contacte o Administrador");
        }

        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json("A verificação do utilizador falhou, por favor contacte o Administrador");
    }
};