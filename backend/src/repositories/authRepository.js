// src/repositories/authRepository.js
// Acceso a datos para autenticación de clientes, administradores, cajeros y registro público
const crypto = require('crypto');
const { executePrepared, withTransaction } = require('../config/db');
const { accountPrefixes } = require('../config/bankConfig');
const { AppError } = require('../utils/AppError');

function generarNumeroCuenta(tipoCuentaId) {
    const prefix = Number(tipoCuentaId) === 2 ? accountPrefixes.corriente : accountPrefixes.ahorros;
    const digits = crypto.randomInt(10000000, 100000000);
    return `${prefix}${digits}`;
}

async function findClienteLogin(valorLimpio, identificadorRaw) {
    const rows = await executePrepared(
        `SELECT DISTINCT u.id, u.nombres, u.apellidos, u.correo, u.numero_documento, u.telefono,
                u.password_hash, u.rol_id, r.nombre AS rol_nombre, e.nombre AS estado_nombre
         FROM usuarios u
         JOIN roles r ON u.rol_id = r.id
         JOIN estados_usuario e ON u.estado_id = e.id
         LEFT JOIN cuentas c ON u.id = c.usuario_id
         WHERE u.numero_documento = ?
            OR c.numero_cuenta = ?
            OR u.correo = ?
         LIMIT 1`,
        [valorLimpio, valorLimpio, identificadorRaw]
    );
    return rows[0] || null;
}

async function findAdminPorCorreo(correo) {
    const rows = await executePrepared(
        `SELECT u.id, u.nombres, u.apellidos, u.correo, u.password_hash, u.rol_id,
                r.nombre AS rol_nombre, e.nombre AS estado_nombre
         FROM usuarios u
         JOIN roles r ON u.rol_id = r.id
         JOIN estados_usuario e ON u.estado_id = e.id
         WHERE u.correo = ? AND u.rol_id = 1
         LIMIT 1`,
        [correo]
    );
    return rows[0] || null;
}

async function findCuentasSegurasPorUsuario(usuarioId) {
    return executePrepared(
        `SELECT c.id, c.usuario_id, c.numero_cuenta, c.tipo_id, c.estado_id, c.saldo, c.creada_en,
                tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
         FROM cuentas c
         JOIN tipos_cuenta tc ON c.tipo_id = tc.id
         JOIN estados_cuenta ec ON c.estado_id = ec.id
         WHERE c.usuario_id = ?`,
        [usuarioId]
    );
}

async function findCuentaParaCajero(cleanId) {
    const rows = await executePrepared(
        `SELECT c.id, c.usuario_id, c.numero_cuenta, c.saldo, c.pin_hash,
                tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta,
                u.nombres, u.apellidos, u.numero_documento, u.estado_id AS usuario_estado_id
         FROM cuentas c
         JOIN tipos_cuenta tc ON c.tipo_id = tc.id
         JOIN estados_cuenta ec ON c.estado_id = ec.id
         JOIN usuarios u ON c.usuario_id = u.id
         WHERE c.numero_cuenta = ? OR u.numero_documento = ?
         LIMIT 1`,
        [cleanId, cleanId]
    );
    return rows[0] || null;
}

async function registrarClienteConSaldoCero({
    tipo_documento_id,
    numero_documento,
    nombres,
    apellidos,
    correo,
    telefono,
    tipo_cuenta_id,
    passwordHash,
    pinHash,
}) {
    return withTransaction(async (exec) => {
        const existentes = await exec(
            `SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)`,
            [correo, tipo_documento_id || 1, numero_documento]
        );
        if (existentes.length > 0) {
            throw new AppError('Ya existe una cuenta registrada con este correo o número de documento.', 400);
        }

        const resUser = await exec(
            `INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, password_hash, rol_id, estado_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)`,
            [tipo_documento_id || 1, numero_documento, nombres, apellidos, correo, telefono || null, passwordHash]
        );
        const nuevoUsuarioId = resUser.insertId;
        const numeroCuenta = generarNumeroCuenta(tipo_cuenta_id);

        // Invariante financiera: toda cuenta pública inicia exactamente en $0.00
        await exec(
            `INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_id, estado_id, pin_hash, saldo)
             VALUES (?, ?, ?, 1, ?, 0.00)`,
            [nuevoUsuarioId, numeroCuenta, tipo_cuenta_id || 1, pinHash]
        );

        return {
            numero_documento,
            numero_cuenta: numeroCuenta,
            titular: `${nombres} ${apellidos}`,
            correo,
            saldo: 0,
        };
    });
}

module.exports = {
    generarNumeroCuenta,
    findClienteLogin,
    findAdminPorCorreo,
    findCuentasSegurasPorUsuario,
    findCuentaParaCajero,
    registrarClienteConSaldoCero,
};
