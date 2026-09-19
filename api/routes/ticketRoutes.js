const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
const ctrl = require('../controllers/ticketController');
const auth = require('../middlewares/authAdminMiddleware');

// Estas duas têm de vir antes de `/:id`, senão "utilizadores" seria lido como o id
// de um ticket e devolveria sempre 404.
router.get('/utilizadores',  auth.requireAuthorization, ctrl.getAssignableUsers);
router.get('/meus/contagem', auth.requireAuthorization, ctrl.getMyOpenCount);

// Ler e alterar é permitido a qualquer utilizador autenticado: a fila de trabalho é
// partilhada e o que trava abusos é o histórico, que regista quem mudou o quê.
router.get('/',    auth.requireAuthorization, ctrl.getAllTickets);
router.post('/',   auth.requireAuthorization, ctrl.createTicket);
router.get('/:id', auth.requireAuthorization, ctrl.getTicketById);
router.put('/:id', auth.requireAuthorization, ctrl.updateTicket);

// Apagar é só de administrador: leva o histórico do ticket à frente, em cascata.
router.delete('/:id', auth.requireAuthorization, auth.requireAdmin, ctrl.deleteTicket);

router.post('/:id/mensagens', auth.requireAuthorization, ctrl.addMessage);

router.post('/:id/obras',                  auth.requireAuthorization, ctrl.linkWorkOrder);
router.delete('/:id/obras/:workOrderId',   auth.requireAuthorization, ctrl.unlinkWorkOrder);
router.post('/:id/rmas',                   auth.requireAuthorization, ctrl.linkRma);
router.delete('/:id/rmas/:rmaId',          auth.requireAuthorization, ctrl.unlinkRma);

router.post('/:id/documentos',          auth.requireAuthorization, upload.single('file'), ctrl.uploadDocument);
router.get('/:id/documentos/:docId',    auth.requireAuthorization, ctrl.getDocument);
router.delete('/:id/documentos/:docId', auth.requireAuthorization, ctrl.deleteDocument);

module.exports = router;
