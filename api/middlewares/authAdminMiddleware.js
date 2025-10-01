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
            where: { id: id },
        });
        if (!user) {
            return res.status(401).json({ error: "unauthorized2" })
        }

        if (user.checkChangePasswordAt(payload.iat)) {
            return res.status(498).json({ error: "Token expired" })
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error" })
    }
}

/*
exports.isAdmin = async (req, res, next) => {
    let tokenParts = req.headers.authorization?.split(" ") ?? [];
    
        if (tokenParts.length !== 2 || tokenParts[0] != "Bearer") {
            return res.status(401).json({ error: "unauthorized3" });
        }

        const token = tokenParts[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET);


        const user = await prisma.user.findUnique({
            where: { id: user.id },
        });
        console.log(user)
    if (!user){
        return res.status(401).json({error: "unauthorized"})
    }
    if(user.role !== 2){
        return res.status(403).json({error: "forbidden"})
    }
    next();
}
*/



exports.isAdmin = async (req, res, next) => {
    const tokenParts = req.headers.authorization?.split(" ") ?? [];

    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res.status(401).json({ error: "unauthorized3" });
    }

    const token = tokenParts[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            return res.status(401).json({ error: "unauthorized" });
        }

        if (user.role !== 2) {
            return res.status(403).json({ error: "forbidden" });
        }

        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json({ error: "unauthorized2" });
    }
};