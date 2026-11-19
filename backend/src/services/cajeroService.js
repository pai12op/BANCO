// src/services/cajeroService.js
// Reglas de negocio de cajero automático (ATM): consulta de saldo, múltiplos de $10.000 y validación OTP/PIN
const bcrypt = require('bcryptjs');
const cajeroRepo = require('../repositories/cajeroRepository');
const bankConfig = require('../config/bankConfig');
const { validarCodigoRetiro } = require('../config/otpStore');
const { AppError } = require('../utils/AppError');
const { parsePositiveAmount } = require('../utils/validators');

async function consultarSaldoAtm(cajeroSession) {
    const cuenta = await cajeroRepo.getSaldoCajero(cajeroSession.id);
    if (!cuenta) {
        throw new AppError('Cuenta no encontrada.', 404);
    }
    const saldoActual = parseFloat(cuenta.saldo);
    return {
        id: cajeroSession.id,
        titular: cajeroSession.titular,
        numero_cuenta: cuenta.numero_cuenta,
        tipo_cuenta: cuenta.tipo_cuenta,
        saldo: saldoActual,
    };
}

async function ejecutarRetiroAtm({ cuentaId, valor, codigoOtp }) {
    const valorNum = parsePositiveAmount(valor, 'El valor a retirar debe ser mayor a cero ($0).');
    if (valorNum % 10000 !== 0) {
        throw new AppError('El valor debe ser múltiplo de $10.000 COP.', 400);
    }
    if (!codigoOtp) {
        throw new AppError('Debe ingresar el código de retiro OTP de 6 dígitos o PIN de 4 dígitos.', 400);
    }

    const cleanOtp = codigoOtp.toString().trim();
    const labelBanco = bankConfig.entityName;

    return cajeroRepo.retirarPorCajero({
        cuentaId,
        valor: valorNum,
        authorizeRetiro: async (cuenta) => {
            if (cleanOtp.length === 6) {
                const esOtpValido = validarCodigoRetiro(cleanOtp, cuenta.numero_cuenta, true);
                if (!esOtpValido) {
                    throw new AppError(
                        `Código de retiro OTP incorrecto o expirado. Genera un nuevo código en ${labelBanco}.`,
                        401
                    );
                }
                return `OTP ${labelBanco} (Sin Tarjeta)`;
            }
            if (cleanOtp.length === 4) {
                const esPinValido = await bcrypt.compare(cleanOtp, cuenta.pin_hash);
                if (!esPinValido) {
                    throw new AppError('PIN de cajero de 4 dígitos incorrecto.', 401);
                }
                return 'Tarjeta Débito (PIN)';
            }
            throw new AppError('El código debe tener 6 dígitos (OTP) o 4 dígitos (PIN).', 400);
        },
    });
}

async function consultarUltimosMovimientosAtm(cuentaId) {
    return cajeroRepo.getUltimosMovimientosCajero(cuentaId);
}

module.exports = {
    consultarSaldoAtm,
    ejecutarRetiroAtm,
    consultarUltimosMovimientosAtm,
};
