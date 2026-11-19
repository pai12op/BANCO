// src/utils/validators.js
// Validadores reutilizables para credenciales, PINs, montos y números de cuenta
const { AppError } = require('./AppError');

const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PIN_4_REGEX = /^\d{4}$/;
const DATE_YYYY_MM_DD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function calculateAgeYears(year, month, day, referenceDate = new Date()) {
    const nowCol = new Date(referenceDate.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const curYear = nowCol.getFullYear();
    const curMonth = nowCol.getMonth() + 1;
    const curDay = nowCol.getDate();

    let age = curYear - year;
    if (curMonth < month || (curMonth === month && curDay < day)) {
        age -= 1;
    }
    return age;
}

function assertAdultBirthDate(rawDate, minAge = 18) {
    if (rawDate === undefined || rawDate === null || rawDate.toString().trim() === '') {
        throw new AppError('Debe ingresar la fecha de nacimiento del titular.', 400);
    }

    const clean = rawDate.toString().trim();
    const match = DATE_YYYY_MM_DD_REGEX.exec(clean);
    if (!match) {
        throw new AppError('Formato de fecha de nacimiento inválido. Use AAAA-MM-DD.', 400);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const utcCheck = new Date(Date.UTC(year, month - 1, day));
    if (
        utcCheck.getUTCFullYear() !== year ||
        utcCheck.getUTCMonth() + 1 !== month ||
        utcCheck.getUTCDate() !== day
    ) {
        throw new AppError('La fecha de nacimiento ingresada no existe en el calendario.', 400);
    }

    const age = calculateAgeYears(year, month, day);
    if (age < 0) {
        throw new AppError('La fecha de nacimiento no puede ser una fecha futura.', 400);
    }
    if (year < 1900 || age > 120) {
        throw new AppError('Ingrese una fecha de nacimiento válida (edad máxima permitida 120 años).', 400);
    }
    if (age < minAge) {
        throw new AppError(
            `Registro rechazado: el titular tiene ${age} años. Debe ser mayor de edad (${minAge}+ años) para abrir una cuenta bancaria.`,
            403
        );
    }

    return clean;
}

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
    assertAdultBirthDate,
    calculateAgeYears,
    parsePositiveAmount,
    cleanAccountIdentifier,
};
