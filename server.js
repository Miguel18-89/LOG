require("dotenv").config();

const cors = require('cors');
const express = require('express');


const userRouter = require('./api/routes/userRoutes');
const storeRouter = require('./api/routes/storeRoutes');
const storeSurveyRouter = require('./api/routes/storeSurveyRoutes');
const storeProvisioningRouter = require('./api/routes/storeProvisioningRoutes');
const storePhase1Router = require('./api/routes/storePhase1Routes');
const storePhase2Router = require('./api/routes/storePhase2Routes');

const app = express();
app.use(express.json());
app.use(cors())

app.use('/users', userRouter);
app.use('/stores', storeRouter);
app.use('/surveys', storeSurveyRouter);
app.use('/provisioning', storeProvisioningRouter);
app.use('/phase1', storePhase1Router);
app.use('/phase2', storePhase2Router);



const PORT = 3000;
app.listen(PORT, () => console.log(`Conectado ${PORT}`));