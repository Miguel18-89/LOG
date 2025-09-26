require("dotenv").config();

const cors = require('cors');
const express = require('express');


const userRouter = require('./api/routes/userRoutes');

const app = express();
app.use(express.json());
app.use(cors())

app.use('/users', userRouter);


const PORT = 3000;
app.listen(PORT, () => console.log(`Conectado ${PORT}`));