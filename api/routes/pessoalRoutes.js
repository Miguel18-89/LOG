const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const ctrl = require('../controllers/pessoalController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',    auth.requireAuthorization, ctrl.getAllEmployees);
router.post('/',   auth.requireAuthorization, ctrl.createEmployee);
router.get('/:id', auth.requireAuthorization, ctrl.getEmployeeById);
router.put('/:id', auth.requireAuthorization, ctrl.updateEmployee);
router.delete('/:id', auth.requireAuthorization, ctrl.deleteEmployee);

router.post('/:id/medical-file',   auth.requireAuthorization, upload.single('file'), ctrl.uploadMedicalFile);
router.get('/:id/medical-file',    auth.requireAuthorization, ctrl.getMedicalFile);
router.delete('/:id/medical-file', auth.requireAuthorization, ctrl.deleteMedicalFile);

router.post('/:id/trainings',          auth.requireAuthorization, upload.single('file'), ctrl.addTraining);
router.put('/:id/trainings/:rid',      auth.requireAuthorization, upload.single('file'), ctrl.updateTraining);
router.get('/:id/trainings/:rid/file', auth.requireAuthorization, ctrl.getTrainingFile);
router.delete('/:id/trainings/:rid',   auth.requireAuthorization, ctrl.deleteTraining);

module.exports = router;
