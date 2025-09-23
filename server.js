require("dotenv").config();

const express = require('express');


const userRouter = require('./api/routes/userRoutes');

const app = express();
app.use(express.json());

app.use('/users', userRouter);

const PORT = 3000;
app.listen(PORT, () => console.log(`Conectado ${PORT}`));