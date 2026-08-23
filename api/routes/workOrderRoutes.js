const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
const ctrl = require('../controllers/workOrderController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',    auth.requireAuthorization, ctrl.getAllWorkOrders);
router.post('/',   auth.requireAuthorization, ctrl.createWorkOrder);
router.get('/:id', auth.requireAuthorization, ctrl.getWorkOrderById);
router.put('/:id', auth.requireAuthorization, ctrl.updateWorkOrder);
router.delete('/:id', auth.requireAuthorization, auth.requireManager, ctrl.deleteWorkOrder);

router.put('/:id/assinatura',    auth.requireAuthorization, ctrl.saveSignature);
router.delete('/:id/assinatura', auth.requireAuthorization, ctrl.deleteSignature);

router.post('/:id/documentos',           auth.requireAuthorization, upload.single('file'), ctrl.uploadDocument);
router.get('/:id/documentos/:docId',     auth.requireAuthorization, ctrl.getDocument);
router.delete('/:id/documentos/:docId',  auth.requireAuthorization, ctrl.deleteDocument);

router.post('/:id/enviar', auth.requireAuthorization, ctrl.sendWorkOrderEmail);

module.exports = router;
