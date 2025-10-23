const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const storeDocumentsController = require('../controllers/storeDocumentsController');

router.post('/upload', upload.single('file'), storeDocumentsController.saveDocumentMetadata);
router.get('/', storeDocumentsController.getDocumentsByStore);

module.exports = router;