const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const storeDocumentsController = require('../controllers/storeDocumentsController');
const { deleteDocument } = require('../controllers/storeDocumentsController');
const authMiddleware = require("../middlewares/authAdminMiddleware");


router.post('/upload', upload.single('file'), authMiddleware.requireAuthorization, storeDocumentsController.saveDocumentMetadata);
router.get('/view/:id', authMiddleware.requireAuthorization, storeDocumentsController.getDocumentsById)
router.get('/:storeId', authMiddleware.requireAuthorization, storeDocumentsController.getDocumentsByStore);
router.delete('/:id', authMiddleware.requireAuthorization, deleteDocument);

module.exports = router;