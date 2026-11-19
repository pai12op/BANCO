// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireEncryptedPayload } = require('../middlewares/security');

router.get('/public-key', authController.getPublicKey);
router.post('/login-cliente', requireEncryptedPayload, authController.loginCliente);
router.post('/registro-cliente', requireEncryptedPayload, authController.registroCliente);
router.post('/login-admin', requireEncryptedPayload, authController.loginAdmin);
router.post('/verify-2fa-admin', requireEncryptedPayload, authController.verify2FAAdmin);
router.post('/resend-2fa-admin', authController.resend2FAAdmin);
router.post('/login-cajero', requireEncryptedPayload, authController.loginCajero);
router.post('/logout', authController.logout);
router.get('/session', authController.checkSession);

module.exports = router;
