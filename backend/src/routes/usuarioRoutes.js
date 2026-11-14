// src/routes/usuarioRoutes.js
// Rutas y operaciones exclusivas del Usuario / Cliente (Banca Virtual)
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { requireCliente } = require('../middlewares/auth');

router.get('/resumen', requireCliente, usuarioController.getResumen);
router.get('/movimientos', requireCliente, usuarioController.getMovimientos);
router.post('/transferir', requireCliente, usuarioController.transferir);
router.post('/perfil', requireCliente, usuarioController.actualizarPerfil);
router.post('/password', requireCliente, usuarioController.cambiarPassword);
router.post('/pago-tarjeta', requireCliente, usuarioController.pagoTarjeta);
router.post('/ajustar-tarjeta', requireCliente, usuarioController.ajustarPlataTarjeta);
router.post('/generar-codigo-retiro', requireCliente, usuarioController.solicitarCodigoRetiro);

module.exports = router;
