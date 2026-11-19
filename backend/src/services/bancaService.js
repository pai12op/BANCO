// src/services/bancaService.js
// Reglas de negocio de Banca Virtual: cuentas, transferencias, cambio de clave con PIN, POS y OTP
const bcrypt = require('bcryptjs');
const cuentaRepo = require('../repositories/cuentaRepository');
const { generarCodigoRetiro } = require('../config/otpStore');
const { AppError } = require('../utils/AppError');
const {
    assertStrongPassword,
    assertValidPin,
    parsePositiveAmount,
} = require('../utils/validators');

async function obtenerResumen(usuarioId) {
    return cuentaRepo.getResumenUsuario(usuarioId);
}

async function obtenerMovimientos(cuentaId, usuarioId) {
    const data = await cuentaRepo.getMovimientosCuenta(cuentaId, usuarioId);
    if (!data) {
        throw new AppError('Acceso denegado a la cuenta solicitada.', 403);
    }
    return data;
}

async function ejecutarTransferencia({ usuarioId, cuenta_origen_id, numero_cuenta_destino, valor, concepto, descripcion }) {
    const valorNum = parsePositiveAmount(valor, 'El valor de la transferencia debe ser mayor a cero ($0).');

    if (!numero_cuenta_destino) {
        throw new AppError('Debe ingresar el número de cuenta de destino.', 400);
    }

    const destinoLimpio = String(numero_cuenta_destino).trim().replace(/\D/g, '');
    if (!destinoLimpio) {
        throw new AppError('El número de cuenta de destino no es válido.', 400);
    }

    return cuentaRepo.transferirEntreCuentas({
        usuarioId,
        cuenta_origen_id,
        numero_cuenta_destino: destinoLimpio,
        valor: valorNum,
        concepto: concepto || descripcion,
    });
}

async function actualizarPerfilTelefono(usuarioId, telefono) {
    const limpio = telefono ? telefono.toString().trim() : null;
    await cuentaRepo.actualizarTelefonoUsuario(usuarioId, limpio);
    return limpio;
}

async function cambiarPasswordAutenticado({ usuarioId, password_actual, password_nuevo, password_confirmacion, pin_cajero }) {
    if (!password_actual || !password_nuevo || !pin_cajero) {
        throw new AppError(
            'Debe ingresar contraseña actual, PIN de seguridad de 4 dígitos y la nueva contraseña.',
            400
        );
    }

    if (password_confirmacion !== undefined && password_nuevo !== password_confirmacion) {
        throw new AppError('La nueva contraseña y su confirmación no coinciden.', 400);
    }

    const pinStr = assertValidPin(pin_cajero, 'El PIN de seguridad');
    assertStrongPassword(password_nuevo, 'La nueva contraseña');

    const { usuario, cuentas } = await cuentaRepo.findCredencialesCambioPassword(usuarioId);
    if (!usuario) {
        throw new AppError('Usuario no encontrado.', 404);
    }

    const passwordValido = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!passwordValido) {
        throw new AppError('Autenticación fallida: la contraseña actual no es correcta.', 401);
    }

    if (!cuentas || cuentas.length === 0) {
        throw new AppError('No cuentas con una cuenta activa para validar el PIN de seguridad.', 403);
    }

    let pinValido = false;
    for (const c of cuentas) {
        if (await bcrypt.compare(pinStr, c.pin_hash)) {
            pinValido = true;
            break;
        }
    }
    if (!pinValido) {
        throw new AppError('Autenticación fallida: el PIN de seguridad de 4 dígitos no coincide.', 401);
    }

    const esIgualActual = await bcrypt.compare(password_nuevo, usuario.password_hash);
    if (esIgualActual) {
        throw new AppError('La nueva contraseña no puede ser igual a la contraseña actual.', 400);
    }

    const nuevoHash = await bcrypt.hash(password_nuevo, 10);
    await cuentaRepo.actualizarPasswordHash(usuarioId, nuevoHash);
}

async function pagarConTarjetaPos({ usuarioId, cuenta_id, valor, establecimiento, pin }) {
    const valorNum = parsePositiveAmount(valor, 'El monto de la compra debe ser mayor a $0.');
    const comercio = establecimiento && establecimiento.toString().trim()
        ? establecimiento.toString().trim().slice(0, 120)
        : 'Establecimiento Comercial (POS Datáfono)';

    return cuentaRepo.procesarPagoTarjetaPos({
        cuenta_id,
        usuarioId,
        valor: valorNum,
        comercio,
        pin,
        verifyPin: (plain, hash) => bcrypt.compare(plain, hash),
    });
}

async function retirarSaldoTarjeta({ usuarioId, cuenta_id, valor, tipo }) {
    if (tipo !== 'QUITAR') {
        throw new AppError(
            'Operación prohibida: ningún cliente puede acreditarse saldo por sí mismo. Solicita una consignación en ventanilla.',
            403
        );
    }
    const valorNum = parsePositiveAmount(valor, 'El valor debe ser superior a $0 COP.');
    const nuevoSaldo = await cuentaRepo.retirarSaldoTarjeta({
        usuarioId,
        cuenta_id,
        valor: valorNum,
    });
    return { valor: valorNum, nuevoSaldo };
}

async function solicitarOtpRetiro({ usuarioId, cuenta_id, numero_cuenta }) {
    const cuenta = await cuentaRepo.findCuentaActivaParaOtp(usuarioId, cuenta_id, numero_cuenta);
    if (!cuenta) {
        throw new AppError('No se encontró cuenta activa para generar código de retiro.', 404);
    }
    const { codigo, expiraMinutos } = generarCodigoRetiro(usuarioId, cuenta.id, cuenta.numero_cuenta);
    return {
        codigo,
        expiraMinutos,
        numero_cuenta: cuenta.numero_cuenta,
        saldo: parseFloat(cuenta.saldo),
    };
}

module.exports = {
    obtenerResumen,
    obtenerMovimientos,
    ejecutarTransferencia,
    actualizarPerfilTelefono,
    cambiarPasswordAutenticado,
    pagarConTarjetaPos,
    retirarSaldoTarjeta,
    solicitarOtpRetiro,
};
