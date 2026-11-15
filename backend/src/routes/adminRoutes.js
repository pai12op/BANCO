// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/dashboard', requireAdmin, adminController.getDashboard);
router.get('/resumen', requireAdmin, adminController.getDashboard); // Alias retrocompatible
router.get('/clientes', requireAdmin, adminController.getClientes);
router.post('/clientes', requireAdmin, adminController.crearCliente);
router.post('/clientes/estado', requireAdmin, adminController.cambiarEstadoCliente);
router.post('/consignar', requireAdmin, adminController.consignar);
router.get('/movimientos-general', requireAdmin, adminController.getHistorialGeneral);

module.exports = router;
