// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login-cliente', authController.loginCliente);
router.post('/registro-cliente', authController.registroCliente);
router.post('/login-admin', authController.loginAdmin);
router.post('/verify-2fa-admin', authController.verify2FAAdmin);
router.post('/resend-2fa-admin', authController.resend2FAAdmin);
router.post('/login-cajero', authController.loginCajero);
router.post('/logout', authController.logout);
router.get('/session', authController.checkSession);

module.exports = router;
