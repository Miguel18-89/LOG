require("dotenv").config();

const cors = require('cors');
const express = require('express');


const userRouter = require('./api/routes/userRoutes');
const storeRouter = require('./api/routes/storeRoutes');
const storeSurveyRouter = require('./api/routes/storeSurveyRoutes');

const app = express();
app.use(express.json());
app.use(cors())

app.use('/users', userRouter);
app.use('/stores', storeRouter);
app.use('/surveys', storeSurveyRouter);


const PORT = 3000;
app.listen(PORT, () => console.log(`Conectado ${PORT}`));