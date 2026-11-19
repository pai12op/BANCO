// src/routes/cajeroRoutes.js
const express = require('express');
const router = express.Router();
const cajeroController = require('../controllers/cajeroController');
const { requireCajero } = require('../middlewares/auth');
const { requireEncryptedPayload } = require('../middlewares/security');

router.get('/saldo', requireCajero, cajeroController.getSaldo);
router.post('/retirar', requireCajero, requireEncryptedPayload, cajeroController.retirar);
router.get('/movimientos', requireCajero, cajeroController.getUltimosMovimientos);

module.exports = router;
