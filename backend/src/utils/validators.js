// src/utils/validators.js
// Validadores reutilizables para credenciales, PINs, montos y números de cuenta
const { AppError } = require('./AppError');

const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PIN_4_REGEX = /^\d{4}$/;

function assertStrongPassword(password, label = 'La contraseña') {
    if (typeof password !== 'string' || !STRONG_PASS_REGEX.test(password)) {
        throw new AppError(
            `${label} debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula y número.`,
            400
        );
    }
}

function assertValidPin(pin, label = 'El PIN de seguridad') {
    const clean = pin !== undefined && pin !== null ? pin.toString().trim() : '';
    if (!PIN_4_REGEX.test(clean)) {
        throw new AppError(`${label} debe ser exactamente de 4 dígitos numéricos.`, 400);
    }
    return clean;
}

function parsePositiveAmount(raw, message = 'El valor debe ser mayor a cero ($0).') {
    const val = parseFloat(raw);
    if (!val || Number.isNaN(val) || val <= 0) {
        throw new AppError(message, 400);
    }
    return val;
}

function cleanAccountIdentifier(raw) {
    return raw !== undefined && raw !== null ? raw.toString().trim().replace(/[-\s]/g, '') : '';
}

module.exports = {
    STRONG_PASS_REGEX,
    PIN_4_REGEX,
    assertStrongPassword,
    assertValidPin,
    parsePositiveAmount,
    cleanAccountIdentifier,
};
