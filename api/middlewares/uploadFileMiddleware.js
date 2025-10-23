const path = require('path');
const multer = require('multer');
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads', 'pdfs');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'pdfs');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});


const uploadPDF = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isPDF = file.mimetype === 'application/pdf';
    cb(null, isPDF);
  },
});

module.exports = uploadPDF;