// src/services/authService.js
// Reglas de negocio de autenticación, 2FA administrativa, cajero y registro público ($0 COP)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const authRepo = require('../repositories/authRepository');
const bankConfig = require('../config/bankConfig');
const { validarCodigoRetiro } = require('../config/otpStore');
const { AppError } = require('../utils/AppError');
const { assertStrongPassword, assertValidPin, assertAdultBirthDate, cleanAccountIdentifier } = require('../utils/validators');

async function autenticarCliente({ identificador, password }) {
    if (!identificador || !password) {
        throw new AppError('Debe ingresar su número de documento o tarjeta y contraseña.', 400);
    }

    const valorLimpio = cleanAccountIdentifier(identificador);
    const usuario = await authRepo.findClienteLogin(valorLimpio, identificador.toString().trim());

    if (!usuario) {
        throw new AppError('Credenciales inválidas.', 401);
    }
    if (usuario.rol_id !== 2) {
        throw new AppError('Este usuario no tiene acceso a la Banca Virtual de clientes.', 403);
    }
    if (usuario.estado_nombre !== 'ACTIVO') {
        throw new AppError(
            `Su usuario se encuentra en estado ${usuario.estado_nombre}. Contacte al administrador del banco.`,
            403
        );
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
        throw new AppError('Credenciales inválidas.', 401);
    }

    const cuentas = await authRepo.findCuentasSegurasPorUsuario(usuario.id);
    const clienteSession = {
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

    return { clienteSession, cuentas };
}

async function autenticarAdmin({ correo, password }) {
    if (!correo || !password) {
        throw new AppError('Ingrese correo y contraseña de administrador.', 400);
    }

    const admin = await authRepo.findAdminPorCorreo(correo.toString().trim());
    if (!admin) {
        throw new AppError('Credenciales administrativas inválidas.', 401);
    }
    if (admin.estado_nombre !== 'ACTIVO') {
        throw new AppError('El usuario administrativo se encuentra inactivo o bloqueado.', 403);
    }

    const passwordValido = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValido) {
        throw new AppError('Credenciales administrativas inválidas.', 401);
    }

    const adminData = {
        id: admin.id,
        nombres: admin.nombres,
        apellidos: admin.apellidos,
        correo: admin.correo,
        rol_id: admin.rol_id,
        rol_nombre: admin.rol_nombre,
    };

    if (!bankConfig.requireAdmin2FA) {
        return {
            requires2FA: false,
            adminData,
            mensaje: `Inicio de sesión administrativo exitoso — ${bankConfig.entityName}.`,
        };
    }

    const codigo2FA = crypto.randomInt(100000, 1000000).toString();
    const pending2FA = {
        adminId: admin.id,
        adminData,
        code: codigo2FA,
        attempts: 0,
        expiresAt: Date.now() + 5 * 60 * 1000,
    };
    const correoEnmascarado = admin.correo.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

    return {
        requires2FA: true,
        pending2FA,
        correoEnmascarado,
        codigo2FA,
    };
}

function verificarCodigo2FAAdmin(pending, codigoIngresado) {
    if (!pending) {
        throw new AppError('No hay un reto 2FA pendiente. Inicie sesión nuevamente.', 400);
    }
    if (Date.now() > pending.expiresAt) {
        return { expired: true };
    }

    const cleanCode = (codigoIngresado || '').toString().trim();
    if (!cleanCode || cleanCode !== pending.code) {
        pending.attempts = (pending.attempts || 0) + 1;
        return {
            valid: false,
            locked: pending.attempts >= 5,
        };
    }

    return {
        valid: true,
        adminData: pending.adminData,
    };
}

function generarNuevoCodigo2FAAdmin(pending) {
    if (!pending) {
        throw new AppError('No hay proceso de autenticación pendiente.', 400);
    }
    const nuevoCodigo = crypto.randomInt(100000, 1000000).toString();
    pending.code = nuevoCodigo;
    pending.attempts = 0;
    pending.expiresAt = Date.now() + 5 * 60 * 1000;
    return { pending, nuevoCodigo };
}

async function autenticarCajero({ numero_cuenta, pin, codigo_retiro }) {
    const authCode = (codigo_retiro || pin || '').toString().trim();
    if (!numero_cuenta || !authCode) {
        throw new AppError('Ingrese el número de cuenta y su PIN o Código de Retiro.', 400);
    }

    const cleanId = cleanAccountIdentifier(numero_cuenta);
    const cuenta = await authRepo.findCuentaParaCajero(cleanId);
    if (!cuenta) {
        throw new AppError('La cuenta ingresada no existe en el sistema.', 404);
    }
    if (cuenta.estado_cuenta !== 'ACTIVA' || cuenta.usuario_estado_id === 3) {
        throw new AppError('La cuenta se encuentra BLOQUEADA o INACTIVA. Operación rechazada.', 403);
    }

    const esOtpValido = validarCodigoRetiro(authCode, cuenta.numero_cuenta, false);
    const pinValido = esOtpValido ? false : await bcrypt.compare(authCode, cuenta.pin_hash);

    if (!esOtpValido && !pinValido) {
        throw new AppError('PIN o Código de Retiro incorrecto o expirado.', 401);
    }

    const cajeroSession = {
        id: cuenta.id,
        usuario_id: cuenta.usuario_id,
        titular: `${cuenta.nombres} ${cuenta.apellidos}`,
        numero_cuenta: cuenta.numero_cuenta,
        tipo_cuenta: cuenta.tipo_cuenta,
        saldo: parseFloat(cuenta.saldo),
        tipo_retiro: esOtpValido ? 'SIN_TARJETA_OTP' : 'TARJETA_PIN',
    };

    const mensaje = esOtpValido
        ? '¡Código de retiro verificado con éxito! Bienvenido al Cajero Virtual.'
        : 'Tarjeta aceptada con éxito. Bienvenido al Cajero ATM.';

    return { cajeroSession, mensaje };
}

async function registrarClientePublico(payload) {
    const {
        tipo_documento_id,
        numero_documento,
        nombres,
        apellidos,
        correo,
        telefono,
        fecha_nacimiento,
        tipo_cuenta_id,
        password,
        pin_cajero,
        saldo_inicial,
        saldo,
        monto_inicial,
    } = payload;

    // Bloqueo estricto: un cliente nunca puede asignarse saldo desde el registro
    if (saldo_inicial !== undefined || saldo !== undefined || monto_inicial !== undefined) {
        const intento = Number(saldo_inicial ?? saldo ?? monto_inicial);
        if (!Number.isNaN(intento) && intento !== 0) {
            throw new AppError(
                'Operación prohibida: ningún cliente puede fijar monto inicial al crear su cuenta. Todas las cuentas nuevas inician en $0 COP.',
                403
            );
        }
    }

    if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
        throw new AppError('Por favor diligencie todos los campos obligatorios del registro.', 400);
    }

    const fechaNacimientoValida = assertAdultBirthDate(fecha_nacimiento, 18);
    const pinStr = assertValidPin(pin_cajero, 'El PIN de seguridad del cajero');
    assertStrongPassword(password, 'La contraseña');

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pinStr, 10);

    return authRepo.registrarClienteConSaldoCero({
        tipo_documento_id,
        numero_documento: numero_documento.toString().trim(),
        nombres: nombres.toString().trim(),
        apellidos: apellidos.toString().trim(),
        correo: correo.toString().trim(),
        telefono: telefono ? telefono.toString().trim() : null,
        fecha_nacimiento: fechaNacimientoValida,
        tipo_cuenta_id,
        passwordHash,
        pinHash,
    });
}

module.exports = {
    autenticarCliente,
    autenticarAdmin,
    verificarCodigo2FAAdmin,
    generarNuevoCodigo2FAAdmin,
    autenticarCajero,
    registrarClientePublico,
};
