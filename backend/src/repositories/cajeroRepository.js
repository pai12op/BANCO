// src/repositories/cajeroRepository.js
// Acceso a datos exclusivo de operaciones en terminal de cajero automático (ATM)
const { executePrepared, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');

async function getSaldoCajero(cuentaId) {
    const rows = await executePrepared(
        `SELECT c.id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
         FROM cuentas c
         JOIN tipos_cuenta tc ON c.tipo_id = tc.id
         JOIN estados_cuenta ec ON c.estado_id = ec.id
         WHERE c.id = ?
         LIMIT 1`,
        [cuentaId]
    );
    return rows[0] || null;
}

async function retirarPorCajero({ cuentaId, valor, authorizeRetiro }) {
    return withTransaction(async (exec) => {
        const cuentas = await exec(
            `SELECT c.id, c.numero_cuenta, c.saldo, c.pin_hash, ec.nombre AS estado_nombre, u.id AS usuario_id
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE c.id = ?
             FOR UPDATE`,
            [cuentaId]
        );
        if (cuentas.length === 0) {
            throw new AppError('Cuenta no encontrada.', 404);
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            throw new AppError('La cuenta no se encuentra activa para retiros.', 403);
        }

        const metodoRetiro = await authorizeRetiro(cuenta);
        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            throw new AppError(
                `Fondos insuficientes. Su saldo disponible es de $${saldoActual.toLocaleString('es-CO')} COP.`,
                400
            );
        }

        const nuevoSaldo = saldoActual - valor;
        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldo, cuentaId]);

        const resOp = await exec(
            `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
             VALUES (2, 1, 1, ?, ?, ?)`,
            [cuenta.usuario_id, valor, `Retiro de efectivo en cajero (${metodoRetiro})`]
        );
        const operacionId = resOp.insertId;

        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'DEBITO', ?)`,
            [operacionId, cuentaId, nuevoSaldo]
        );

        return {
            cajero_id: 'ATM-BOG-004',
            transaccion_id: operacionId,
            numero_operacion: operacionId,
            fecha: new Date(),
            numero_cuenta: cuenta.numero_cuenta,
            valor,
            valor_retirado: valor,
            nuevo_saldo: nuevoSaldo,
            metodo_retiro: metodoRetiro,
        };
    });
}

async function getUltimosMovimientosCajero(cuentaId) {
    return executePrepared(
        `SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante,
                m.creada_en AS fecha_hora, o.descripcion, top.nombre AS tipo_operacion
         FROM movimientos m
         JOIN operaciones o ON m.operacion_id = o.id
         JOIN tipos_operacion top ON o.tipo_id = top.id
         WHERE m.cuenta_id = ?
         ORDER BY m.creada_en DESC, m.id DESC
         LIMIT 5`,
        [cuentaId]
    );
}

module.exports = {
    getSaldoCajero,
    retirarPorCajero,
    getUltimosMovimientosCajero,
};
