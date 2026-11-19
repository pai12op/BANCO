// src/controllers/authController.js
// Controlador HTTP delgado: traduce solicitudes/sesión a llamadas del servicio de autenticación
const authService = require('../services/authService');
const bankConfig = require('../config/bankConfig');
const { getPublicKeyInfo } = require('../config/payloadCrypto');
const { handleControllerError } = require('../utils/AppError');

function getPublicKey(_req, res) {
    return res.json(getPublicKeyInfo());
}

async function loginCliente(req, res) {
    try {
        const { clienteSession, cuentas } = await authService.autenticarCliente(req.body || {});
        req.session.cliente = clienteSession;
        req.session.usuario = clienteSession;

        return res.json({
            exito: true,
            mensaje: 'Inicio de sesión exitoso.',
            usuario: clienteSession,
            cuentas,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.loginCliente', 'Error interno en el servidor.');
    }
}

async function loginAdmin(req, res) {
    try {
        const result = await authService.autenticarAdmin(req.body || {});
        if (!result.requires2FA) {
            req.session.admin = result.adminData;
            return res.json({
                exito: true,
                requires2FA: false,
                mensaje: result.mensaje,
                admin: result.adminData,
            });
        }

        req.session.pendingAdmin2FA = result.pending2FA;
        return res.json({
            requires2FA: true,
            mensaje: 'Credenciales autorizadas. Ingrese el código de autenticación en dos pasos (2FA).',
            correo_enmascarado: result.correoEnmascarado,
            codigo_demo: result.codigo2FA,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.loginAdmin', 'Error interno en el servidor.');
    }
}

async function verify2FAAdmin(req, res) {
    try {
        const pending = req.session.pendingAdmin2FA;
        const result = authService.verificarCodigo2FAAdmin(pending, req.body?.codigo);

        if (result.expired) {
            delete req.session.pendingAdmin2FA;
            return res.status(401).json({ error: 'El código 2FA ha expirado. Solicite un nuevo código.' });
        }
        if (!result.valid) {
            if (result.locked) {
                delete req.session.pendingAdmin2FA;
                return res.status(429).json({ error: 'Demasiados intentos fallidos. Inicie sesión nuevamente.' });
            }
            return res.status(401).json({ error: 'Código 2FA incorrecto o no autorizado.' });
        }

        req.session.admin = result.adminData;
        delete req.session.pendingAdmin2FA;

        return res.json({
            exito: true,
            mensaje: 'Segundo factor 2FA verificado con éxito. Acceso concedido.',
            admin: req.session.admin,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.verify2FAAdmin', 'Error al verificar código 2FA.');
    }
}

async function resend2FAAdmin(req, res) {
    try {
        const { pending, nuevoCodigo } = authService.generarNuevoCodigo2FAAdmin(req.session.pendingAdmin2FA);
        req.session.pendingAdmin2FA = pending;
        return res.json({
            exito: true,
            mensaje: 'Nuevo código 2FA generado exitosamente.',
            codigo_demo: nuevoCodigo,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.resend2FAAdmin', 'Error al generar nuevo código 2FA.');
    }
}

async function loginCajero(req, res) {
    try {
        const { cajeroSession, mensaje } = await authService.autenticarCajero(req.body || {});
        req.session.cajero = cajeroSession;
        req.session.cajeroCuenta = cajeroSession;

        return res.json({
            exito: true,
            mensaje,
            cuenta: cajeroSession,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.loginCajero', 'Error en la terminal del cajero automático.');
    }
}

function logout(req, res) {
    const modulo = req.body?.modulo || req.query?.modulo;
    if (modulo === 'cliente') {
        delete req.session.cliente;
        delete req.session.usuario;
        return res.json({ exito: true, mensaje: 'Sesión de Banca Virtual cerrada con éxito.' });
    }
    if (modulo === 'admin') {
        delete req.session.admin;
        delete req.session.pendingAdmin2FA;
        return res.json({ exito: true, mensaje: 'Sesión administrativa cerrada con éxito.' });
    }
    if (modulo === 'cajero') {
        delete req.session.cajero;
        delete req.session.cajeroCuenta;
        return res.json({ exito: true, mensaje: 'Tarjeta expulsada con éxito de la terminal.' });
    }
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
        res.clearCookie(bankConfig.sessionCookieName);
        return res.json({ exito: true, mensaje: 'Sesión finalizada con éxito.' });
    });
}

function checkSession(req, res) {
    return res.json({
        cliente: req.session.cliente || null,
        admin: req.session.admin || null,
        cajero: req.session.cajero || req.session.cajeroCuenta || null,
    });
}

async function registroCliente(req, res) {
    try {
        const cuenta = await authService.registrarClientePublico(req.body || {});
        return res.json({
            exito: true,
            mensaje: '¡Cuenta creada con éxito! Inicia sesión con tu documento; tu saldo inicial es $0 COP.',
            cuenta,
        });
    } catch (error) {
        return handleControllerError(res, error, 'authController.registroCliente', 'Error al procesar la apertura de la cuenta.');
    }
}

module.exports = {
    getPublicKey,
    loginCliente,
    loginAdmin,
    verify2FAAdmin,
    resend2FAAdmin,
    loginCajero,
    logout,
    checkSession,
    registroCliente,
};
