const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
const ctrl = require('../controllers/rmaController');
const auth = require('../middlewares/authAdminMiddleware');

router.get('/',        auth.requireAuthorization, ctrl.getAllRMAs);
router.post('/',       auth.requireAuthorization, ctrl.createRMA);
router.get('/:id',     auth.requireAuthorization, ctrl.getRMAById);
router.put('/:id',     auth.requireAuthorization, ctrl.updateRMA);
router.delete('/:id',  auth.requireAuthorization, ctrl.deleteRMA);
router.post('/:id/updates', auth.requireAuthorization, ctrl.addUpdate);

router.post('/:id/documentos',          auth.requireAuthorization, upload.single('file'), ctrl.uploadDocument);
router.get('/:id/documentos/:docId',    auth.requireAuthorization, ctrl.getDocument);
router.put('/:id/documentos/:docId',    auth.requireAuthorization, ctrl.updateDocumentCaption);
router.delete('/:id/documentos/:docId', auth.requireAuthorization, ctrl.deleteDocument);

module.exports = router;
