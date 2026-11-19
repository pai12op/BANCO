// src/config/otpStore.js
// Almacén en memoria para códigos OTP criptográficos de retiro sin tarjeta en cajeros ATM
const crypto = require('crypto');

const codigosRetiro = new Map();

function generarCodigoRetiro(usuarioId, cuentaId, numeroCuenta) {
    const codigo = crypto.randomInt(100000, 1000000).toString();
    const expira = Date.now() + 30 * 60 * 1000;

    codigosRetiro.set(codigo, {
        usuarioId,
        cuentaId,
        numeroCuenta: numeroCuenta.toString().trim(),
        expira,
    });

    return { codigo, expiraMinutos: 30 };
}

function validarCodigoRetiro(codigo, numeroCuenta, consumir = true) {
    if (!codigo || !numeroCuenta) return false;
    const cleanCode = codigo.toString().trim();
    const entry = codigosRetiro.get(cleanCode);

    if (!entry) return false;

    if (Date.now() > entry.expira) {
        codigosRetiro.delete(cleanCode);
        return false;
    }

    const cleanNum = numeroCuenta.toString().trim().replace(/[-\s]/g, '');
    const entryNum = entry.numeroCuenta.toString().trim().replace(/[-\s]/g, '');

    if (cleanNum === entryNum) {
        if (consumir) {
            codigosRetiro.delete(cleanCode);
        }
        return true;
    }

    return false;
}

module.exports = {
    generarCodigoRetiro,
    validarCodigoRetiro,
    codigosRetiro,
};
