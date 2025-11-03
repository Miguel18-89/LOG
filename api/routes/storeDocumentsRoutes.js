const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const storeDocumentsController = require('../controllers/storeDocumentsController');
const { deleteDocument } = require('../controllers/storeDocumentsController');


router.post('/upload', upload.single('file'), storeDocumentsController.saveDocumentMetadata);
router.get('/view/:id', storeDocumentsController.getDocumentsById)
router.get('/:storeId', storeDocumentsController.getDocumentsByStore);
router.delete('/:id', deleteDocument);

module.exports = router;