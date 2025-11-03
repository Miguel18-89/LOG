require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // ou '*' para liberar geral
  credentials: true,               // se estiver usando cookies/autenticação
}));







const userRouter = require('./api/routes/userRoutes');
const storeRouter = require('./api/routes/storeRoutes');
const storeSurveyRouter = require('./api/routes/storeSurveyRoutes');
const storeProvisioningRouter = require('./api/routes/storeProvisioningRoutes');
const storePhase1Router = require('./api/routes/storePhase1Routes');
const storePhase2Router = require('./api/routes/storePhase2Routes');
const storeCommentsRouter = require('./api/routes/storeCommentsRoutes');
const storeDocumentsRouter = require('./api/routes/storeDocumentsRoutes');



app.use(express.json());





app.use('/users', userRouter);
app.use('/stores', storeRouter);
app.use('/surveys', storeSurveyRouter);
app.use('/provisioning', storeProvisioningRouter);
app.use('/phase1', storePhase1Router);
app.use('/phase2', storePhase2Router);
app.use('/comments', storeCommentsRouter);
app.use('/documents', storeDocumentsRouter );
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));





const PORT = 3000;
app.listen(PORT, () => console.log(`Conectado ${PORT}`));