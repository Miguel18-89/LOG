const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Full JWT verification + DB lookup. Populates req.user.
exports.requireAuthorization = async (req, res, next) => {
    try {
        const tokenParts = req.headers.authorization?.split(" ") ?? [];
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            return res.status(401).json({ error: "Não autenticado." });
        }

        const token = tokenParts[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });

        if (!user) return res.status(401).json({ error: "Utilizador não encontrado." });
        if (!user.is_active) return res.status(401).json({ error: "Conta desativada." });
        if (!user.approved) return res.status(403).json({ error: "Conta ainda não aprovada." });

        if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
            return res.status(401).json({
                error: 'Sessão inválida. Por favor, faça login novamente.',
                reason: 'token_revoked_after_password_change',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") return res.status(401).json({ error: "Sessão expirada. Por favor, faça login novamente." });
        if (error.name === "JsonWebTokenError") return res.status(401).json({ error: "Token inválido." });
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

// Lightweight role guards — use AFTER requireAuthorization (no extra DB query).
exports.requireManager = (req, res, next) => {
    if (!req.user || req.user.role < 1)
        return res.status(403).json({ error: "Sem permissão. É necessário ser gestor ou administrador." });
    next();
};

exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role < 2)
        return res.status(403).json({ error: "Sem permissão. É necessário ser administrador." });
    next();
};

// Legacy middlewares kept for backward compatibility with existing routes.
// They re-verify the token because they may be called without requireAuthorization.
exports.isAdmin = async (req, res, next) => {
    if (req.user) {
        if (req.user.role !== 2) return res.status(403).json({ error: "Não autorizado." });
        return next();
    }
    const tokenParts = req.headers.authorization?.split(" ") ?? [];
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer")
        return res.status(401).json({ error: "Não autenticado." });
    try {
        const payload = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.is_active) return res.status(401).json({ error: "Utilizador não encontrado ou inativo." });
        if (user.role !== 2) return res.status(403).json({ error: "Não autorizado." });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
};

exports.isManager = async (req, res, next) => {
    if (req.user) {
        if (req.user.role < 1) return res.status(403).json({ error: "Não autorizado." });
        return next();
    }
    const tokenParts = req.headers.authorization?.split(" ") ?? [];
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer")
        return res.status(401).json({ error: "Não autenticado." });
    try {
        const payload = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.is_active) return res.status(401).json({ error: "Utilizador não encontrado ou inativo." });
        if (user.role < 1) return res.status(403).json({ error: "Não autorizado." });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
};

exports.isNotManager = async (req, res, next) => {
    if (req.user) {
        if (req.user.role === 1) return res.status(403).json({ error: "Não autorizado." });
        return next();
    }
    const tokenParts = req.headers.authorization?.split(" ") ?? [];
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer")
        return res.status(401).json({ error: "Não autenticado." });
    try {
        const payload = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.is_active) return res.status(401).json({ error: "Utilizador não encontrado ou inativo." });
        if (user.role === 1) return res.status(403).json({ error: "Não autorizado." });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
};
