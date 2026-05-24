const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
const ctrl = require('../controllers/pessoalController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',    auth.requireAuthorization, ctrl.getAllEmployees);
router.post('/',   auth.requireAuthorization, auth.requireManager, ctrl.createEmployee);
router.get('/:id', auth.requireAuthorization, ctrl.getEmployeeById);
router.put('/:id', auth.requireAuthorization, ctrl.updateEmployee);
router.delete('/:id', auth.requireAuthorization, auth.requireManager, ctrl.deleteEmployee);

router.post('/:id/medical-file',   auth.requireAuthorization, auth.requireManager, upload.single('file'), ctrl.uploadMedicalFile);
router.get('/:id/medical-file',    auth.requireAuthorization, ctrl.getMedicalFile);
router.delete('/:id/medical-file', auth.requireAuthorization, auth.requireManager, ctrl.deleteMedicalFile);

router.post('/:id/trainings',          auth.requireAuthorization, auth.requireManager, upload.single('file'), ctrl.addTraining);
router.put('/:id/trainings/:rid',      auth.requireAuthorization, auth.requireManager, upload.single('file'), ctrl.updateTraining);
router.get('/:id/trainings/:rid/file', auth.requireAuthorization, ctrl.getTrainingFile);
router.delete('/:id/trainings/:rid',   auth.requireAuthorization, auth.requireManager, ctrl.deleteTraining);

module.exports = router;
