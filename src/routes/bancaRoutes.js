// src/routes/bancaRoutes.js
const express = require('express');
const router = express.Router();
const bancaController = require('../controllers/bancaController');
const { requireCliente } = require('../middlewares/auth');

router.get('/resumen', requireCliente, bancaController.getResumen);
router.get('/movimientos', requireCliente, bancaController.getMovimientos);
router.post('/transferir', requireCliente, bancaController.transferir);
router.post('/perfil', requireCliente, bancaController.actualizarPerfil);
router.post('/password', requireCliente, bancaController.cambiarPassword);

module.exports = router;
