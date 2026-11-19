// src/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { requireCliente } = require('../middlewares/auth');
const { requireEncryptedPayload } = require('../middlewares/security');

router.get('/resumen', requireCliente, usuarioController.getResumen);
router.get('/movimientos', requireCliente, usuarioController.getMovimientos);
router.post('/transferir', requireCliente, requireEncryptedPayload, usuarioController.transferir);
router.post('/perfil', requireCliente, usuarioController.actualizarPerfil);
router.post('/password', requireCliente, requireEncryptedPayload, usuarioController.cambiarPassword);
router.post('/pago-tarjeta', requireCliente, requireEncryptedPayload, usuarioController.pagoTarjeta);
router.post('/ajustar-tarjeta', requireCliente, requireEncryptedPayload, usuarioController.ajustarPlataTarjeta);
router.post('/generar-codigo-retiro', requireCliente, usuarioController.solicitarCodigoRetiro);

module.exports = router;
