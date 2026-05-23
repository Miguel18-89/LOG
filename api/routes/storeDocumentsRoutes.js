const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });

const storeDocumentsController = require('../controllers/storeDocumentsController');
const { deleteDocument } = require('../controllers/storeDocumentsController');
const authMiddleware = require("../middlewares/authAdminMiddleware");

router.post('/upload', authMiddleware.requireAuthorization, upload.single('file'), storeDocumentsController.saveDocumentMetadata);
router.get('/view/:id', authMiddleware.requireAuthorization, storeDocumentsController.getDocumentsById)
router.get('/:storeId', authMiddleware.requireAuthorization, storeDocumentsController.getDocumentsByStore);
router.delete('/:id', authMiddleware.requireAuthorization, deleteDocument);

module.exports = router;