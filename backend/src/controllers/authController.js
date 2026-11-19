// src/controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const bankRepository = require('../repositories/bankRepository');
const { getPublicKeyInfo } = require('../config/payloadCrypto');
const { validarCodigoRetiro } = require('../config/otpStore');

const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// 0. Llave pública RSA-OAEP para cifrado de carga útil en tránsito
function getPublicKey(req, res) {
    return res.json(getPublicKeyInfo());
}

// 1. Iniciar sesión en Banca Virtual (Cliente)
async function loginCliente(req, res) {
    try {
        const { identificador, password } = req.body;
        if (!identificador || !password) {
            return res.status(400).json({ error: 'Debe ingresar su número de documento o tarjeta y contraseña.' });
        }

        const valorLimpio = identificador.toString().trim().replace(/[-\s]/g, '');
        const usuario = await bankRepository.findClienteLogin(valorLimpio, identificador.toString().trim());

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        if (usuario.rol_id !== 2) {
            return res.status(403).json({ error: 'Este usuario no tiene acceso a la Banca Virtual de clientes.' });
        }

        if (usuario.estado_nombre !== 'ACTIVO') {
            return res.status(403).json({ error: `Su usuario se encuentra en estado ${usuario.estado_nombre}. Contacte al administrador del banco.` });
        }

        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const cuentas = await bankRepository.findCuentasSegurasPorUsuario(usuario.id);

        req.session.cliente = {
            id: usuario.id,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            numero_documento: usuario.numero_documento,
            telefono: usuario.telefono,
            rol_id: usuario.rol_id,
            rol_nombre: usuario.rol_nombre,
            cuenta_principal_id: cuentas.length > 0 ? cuentas[0].id : null,
            numero_cuenta: cuentas.length > 0 ? cuentas[0].numero_cuenta : null,
        };
        req.session.usuario = req.session.cliente;

        return res.json({
            exito: true,
            mensaje: 'Inicio de sesión exitoso.',
            usuario: req.session.cliente,
            cuentas,
        });
    } catch (error) {
        console.error('Error en loginCliente:', error.message);
        return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
}

// 2. Iniciar sesión en Panel Administrativo (Paso 1: Credenciales -> 2FA)
async function loginAdmin(req, res) {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) {
            return res.status(400).json({ error: 'Ingrese correo y contraseña de administrador.' });
        }

        const admin = await bankRepository.findAdminPorCorreo(correo.toString().trim());
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales administrativas inválidas.' });
        }

        if (admin.estado_nombre !== 'ACTIVO') {
            return res.status(403).json({ error: 'El usuario administrativo se encuentra inactivo o bloqueado.' });
        }

        const passwordValido = await bcrypt.compare(password, admin.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales administrativas inválidas.' });
        }

        const codigo2FA = crypto.randomInt(100000, 1000000).toString();
        req.session.pendingAdmin2FA = {
            adminId: admin.id,
            adminData: {
                id: admin.id,
                nombres: admin.nombres,
                apellidos: admin.apellidos,
                correo: admin.correo,
                rol_id: admin.rol_id,
                rol_nombre: admin.rol_nombre,
            },
            code: codigo2FA,
            attempts: 0,
            expiresAt: Date.now() + 5 * 60 * 1000,
        };

        const correoEnmascarado = admin.correo.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

        return res.json({
            requires2FA: true,
            mensaje: 'Credenciales autorizadas. Ingrese el código de autenticación en dos pasos (2FA).',
            correo_enmascarado: correoEnmascarado,
            codigo_demo: codigo2FA,
        });
    } catch (error) {
        console.error('Error en loginAdmin:', error.message);
        return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
}

// 2.1 Verificar Segundo Factor (2FA) con límite de intentos
async function verify2FAAdmin(req, res) {
    try {
        const { codigo } = req.body;
        const pending = req.session.pendingAdmin2FA;

        if (!pending) {
            return res.status(400).json({ error: 'No hay un reto 2FA pendiente. Inicie sesión nuevamente.' });
        }

        if (Date.now() > pending.expiresAt) {
            delete req.session.pendingAdmin2FA;
            return res.status(401).json({ error: 'El código 2FA ha expirado. Solicite un nuevo código.' });
        }

        const cleanCode = (codigo || '').toString().trim();
        if (!cleanCode || cleanCode !== pending.code) {
            pending.attempts = (pending.attempts || 0) + 1;
            if (pending.attempts >= 5) {
                delete req.session.pendingAdmin2FA;
                return res.status(429).json({ error: 'Demasiados intentos fallidos. Inicie sesión nuevamente.' });
            }
            return res.status(401).json({ error: 'Código 2FA incorrecto o no autorizado.' });
        }

        req.session.admin = pending.adminData;
        delete req.session.pendingAdmin2FA;

        return res.json({
            exito: true,
            mensaje: 'Segundo factor 2FA verificado con éxito. Acceso concedido.',
            admin: req.session.admin,
        });
    } catch (error) {
        console.error('Error en verify2FAAdmin:', error.message);
        return res.status(500).json({ error: 'Error al verificar código 2FA.' });
    }
}

// 2.2 Reenviar código 2FA
async function resend2FAAdmin(req, res) {
    try {
        const pending = req.session.pendingAdmin2FA;
        if (!pending) {
            return res.status(400).json({ error: 'No hay proceso de autenticación pendiente.' });
        }

        const nuevoCodigo = crypto.randomInt(100000, 1000000).toString();
        pending.code = nuevoCodigo;
        pending.attempts = 0;
        pending.expiresAt = Date.now() + 5 * 60 * 1000;
        req.session.pendingAdmin2FA = pending;

        return res.json({
            exito: true,
            mensaje: 'Nuevo código 2FA generado exitosamente.',
            codigo_demo: nuevoCodigo,
        });
    } catch (error) {
        console.error('Error en resend2FAAdmin:', error.message);
        return res.status(500).json({ error: 'Error al generar nuevo código 2FA.' });
    }
}

// 3. Identificación en Cajero Automático (Cuenta + PIN 4 dígitos o OTP 6 dígitos)
async function loginCajero(req, res) {
    try {
        const { numero_cuenta, pin, codigo_retiro } = req.body;
        const authCode = (codigo_retiro || pin || '').toString().trim();

        if (!numero_cuenta || !authCode) {
            return res.status(400).json({ error: 'Ingrese el número de cuenta y su PIN o Código de Retiro.' });
        }

        const cleanId = numero_cuenta.toString().trim().replace(/[-\s]/g, '');
        const cuenta = await bankRepository.findCuentaParaCajero(cleanId);

        if (!cuenta) {
            return res.status(404).json({ error: 'La cuenta ingresada no existe en el sistema.' });
        }

        if (cuenta.estado_cuenta !== 'ACTIVA' || cuenta.usuario_estado_id === 3) {
            return res.status(403).json({ error: 'La cuenta se encuentra BLOQUEADA o INACTIVA. Operación rechazada.' });
        }

        const esOtpValido = validarCodigoRetiro(authCode, cuenta.numero_cuenta, false);
        let pinValido = false;
        if (!esOtpValido) {
            pinValido = await bcrypt.compare(authCode, cuenta.pin_hash);
        }

        if (!esOtpValido && !pinValido) {
            return res.status(401).json({ error: 'PIN o Código de Retiro incorrecto o expirado.' });
        }

        req.session.cajero = {
            id: cuenta.id,
            usuario_id: cuenta.usuario_id,
            titular: `${cuenta.nombres} ${cuenta.apellidos}`,
            numero_cuenta: cuenta.numero_cuenta,
            tipo_cuenta: cuenta.tipo_cuenta,
            saldo: parseFloat(cuenta.saldo),
            tipo_retiro: esOtpValido ? 'SIN_TARJETA_OTP' : 'TARJETA_PIN',
        };
        req.session.cajeroCuenta = req.session.cajero;

        return res.json({
            exito: true,
            mensaje: esOtpValido
                ? '¡Código de retiro verificado con éxito! Bienvenido al Cajero Virtual.'
                : 'Tarjeta aceptada con éxito. Bienvenido al Cajero ATM.',
            cuenta: req.session.cajero,
        });
    } catch (error) {
        console.error('Error en loginCajero:', error.message);
        return res.status(500).json({ error: 'Error en la terminal del cajero automático.' });
    }
}

// 4. Cerrar sesión aislada por módulo
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
        if (err) {
            return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
        }
        res.clearCookie('bancarota.sid');
        return res.json({ exito: true, mensaje: 'Sesión finalizada con éxito.' });
    });
}

// 5. Consultar estado de sesión actual
function checkSession(req, res) {
    return res.json({
        cliente: req.session.cliente || null,
        admin: req.session.admin || null,
        cajero: req.session.cajero || req.session.cajeroCuenta || null,
    });
}

// 6. Registro / Apertura de Cuenta Pública (Cliente siempre inicia con $0 COP)
async function registroCliente(req, res) {
    try {
        const {
            tipo_documento_id,
            numero_documento,
            nombres,
            apellidos,
            correo,
            telefono,
            tipo_cuenta_id,
            password,
            pin_cajero,
            saldo_inicial,
            saldo,
            monto_inicial,
        } = req.body;

        // Bloqueo estricto: un cliente nunca puede asignarse saldo desde el registro
        if (saldo_inicial !== undefined || saldo !== undefined || monto_inicial !== undefined) {
            const intento = Number(saldo_inicial ?? saldo ?? monto_inicial);
            if (!Number.isNaN(intento) && intento !== 0) {
                return res.status(403).json({
                    error: 'Operación prohibida: ningún cliente puede fijar monto inicial al crear su cuenta. Todas las cuentas nuevas inician en $0 COP.',
                });
            }
        }

        if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
            return res.status(400).json({ error: 'Por favor diligencie todos los campos obligatorios del registro.' });
        }

        const pinStr = pin_cajero.toString().trim();
        if (pinStr.length !== 4 || !/^\d{4}$/.test(pinStr)) {
            return res.status(400).json({ error: 'El PIN de seguridad del cajero debe ser de exactamente 4 dígitos numéricos.' });
        }

        if (!STRONG_PASS_REGEX.test(password)) {
            return res.status(400).json({
                error: 'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula y número.',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(pinStr, 10);

        const cuenta = await bankRepository.registrarClienteConSaldoCero({
            tipo_documento_id,
            numero_documento: numero_documento.toString().trim(),
            nombres: nombres.toString().trim(),
            apellidos: apellidos.toString().trim(),
            correo: correo.toString().trim(),
            telefono: telefono ? telefono.toString().trim() : null,
            tipo_cuenta_id,
            passwordHash,
            pinHash,
            esBancoCorazones: false,
        });

        return res.json({
            exito: true,
            mensaje: '¡Cuenta creada con éxito! Inicia sesión con tu documento; tu saldo inicial es $0 COP.',
            cuenta,
        });
    } catch (error) {
        console.error('Error en registroCliente:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error al procesar la apertura de la cuenta.',
        });
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
