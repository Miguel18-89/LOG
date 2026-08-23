require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://213.199.58.233:8080')
    .split(',')
    .map(s => s.trim());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin || allowedOrigins[0]);
        } else {
            callback(new Error(`CORS: origin not allowed — ${origin}`));
        }
    },
    credentials: true,
}));







const userRouter = require('./api/routes/userRoutes');
const storeRouter = require('./api/routes/storeRoutes');
const storeSurveyRouter = require('./api/routes/storeSurveyRoutes');
const storeProvisioningRouter = require('./api/routes/storeProvisioningRoutes');
const storePhase1Router = require('./api/routes/storePhase1Routes');
const storePhase2Router = require('./api/routes/storePhase2Routes');
const storeCommentsRouter = require('./api/routes/storeCommentsRoutes');
const storeDocumentsRouter = require('./api/routes/storeDocumentsRoutes');
const overtimeRouter = require('./api/routes/overtimeRoutes');
const hourBankRouter = require('./api/routes/hourBankRoutes');
const rmaRouter = require('./api/routes/rmaRoutes');
const frotaRouter = require('./api/routes/frotaRoutes');
const pessoalRouter = require('./api/routes/pessoalRoutes');
const feriasRouter  = require('./api/routes/feriasRoutes');
const workOrderRouter = require('./api/routes/workOrderRoutes');



app.use(express.json({ limit: '10mb' }));





app.use('/users', userRouter);
app.use('/stores', storeRouter);
app.use('/surveys', storeSurveyRouter);
app.use('/provisioning', storeProvisioningRouter);
app.use('/phase1', storePhase1Router);
app.use('/phase2', storePhase2Router);
app.use('/comments', storeCommentsRouter);
app.use('/documents', storeDocumentsRouter );
app.use('/emg/horas-extra', overtimeRouter);
app.use('/emg/banco-horas', hourBankRouter);
app.use('/emg/rma', rmaRouter);
app.use('/emg/frota', frotaRouter);
app.use('/emg/pessoal', pessoalRouter);
app.use('/emg/ferias',  feriasRouter);
app.use('/emg/obras',   workOrderRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));





const { startMondayReportJob } = require('./api/jobs/mondayReport');

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Conectado ${PORT}`);
    startMondayReportJob();
});