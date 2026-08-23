const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
const ctrl = require('../controllers/workOrderController');
const auth = require('../middlewares/authAdminMiddleware');

// Ler é permitido a qualquer utilizador autenticado (consultar trabalho de colegas no
// terreno). Alterar exige ser técnico da obra, o seu criador, ou administrador — essa
// verificação é feita no controlador, que precisa de carregar a obra para a fazer.
router.get('/',    auth.requireAuthorization, ctrl.getAllWorkOrders);
router.post('/',   auth.requireAuthorization, ctrl.createWorkOrder);
router.get('/:id', auth.requireAuthorization, ctrl.getWorkOrderById);
router.put('/:id', auth.requireAuthorization, ctrl.updateWorkOrder);

// Eliminar a obra apaga também a assinatura em cascata, por isso exige o mesmo nível
// que remover a assinatura — caso contrário seria uma forma de contornar essa regra.
router.delete('/:id', auth.requireAuthorization, auth.requireAdmin, ctrl.deleteWorkOrder);

router.put('/:id/assinatura',    auth.requireAuthorization, ctrl.saveSignature);
router.delete('/:id/assinatura', auth.requireAuthorization, auth.requireAdmin, ctrl.deleteSignature);

router.post('/:id/documentos',           auth.requireAuthorization, upload.single('file'), ctrl.uploadDocument);
router.get('/:id/documentos/:docId',     auth.requireAuthorization, ctrl.getDocument);
router.delete('/:id/documentos/:docId',  auth.requireAuthorization, ctrl.deleteDocument);

router.post('/:id/enviar', auth.requireAuthorization, ctrl.sendWorkOrderEmail);

module.exports = router;
