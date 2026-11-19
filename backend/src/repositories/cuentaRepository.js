// src/repositories/cuentaRepository.js
// Acceso a datos transaccional para cuentas, movimientos, transferencias, credenciales y datáfono POS
const crypto = require('crypto');
const { executePrepared, withTransaction } = require('../config/db');
const { findCuentasSegurasPorUsuario } = require('./authRepository');
const { AppError } = require('../utils/AppError');

async function getResumenUsuario(usuarioId) {
    const cuentas = await findCuentasSegurasPorUsuario(usuarioId);
    const usuarios = await executePrepared(
        `SELECT u.id, u.nombres, u.apellidos, u.correo, u.telefono, u.numero_documento, td.codigo AS tipo_documento
         FROM usuarios u
         JOIN tipos_documento td ON u.tipo_documento_id = td.id
         WHERE u.id = ?
         LIMIT 1`,
        [usuarioId]
    );
    return { usuario: usuarios[0] || null, cuentas };
}

async function getMovimientosCuenta(cuentaId, usuarioId) {
    const verif = await executePrepared(
        `SELECT id, numero_cuenta, saldo FROM cuentas WHERE id = ? AND usuario_id = ? LIMIT 1`,
        [cuentaId, usuarioId]
    );
    if (verif.length === 0) return null;

    const movimientos = await executePrepared(
        `SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante,
                m.creada_en AS fecha_hora, m.creada_en AS fecha,
                o.descripcion, top.nombre AS tipo_operacion, can.nombre AS canal
         FROM movimientos m
         JOIN operaciones o ON m.operacion_id = o.id
         JOIN tipos_operacion top ON o.tipo_id = top.id
         JOIN canales can ON o.canal_id = can.id
         WHERE m.cuenta_id = ?
         ORDER BY m.creada_en DESC, m.id DESC`,
        [cuentaId]
    );

    return { cuenta: verif[0], movimientos };
}

async function transferirEntreCuentas({ usuarioId, cuenta_origen_id, numero_cuenta_destino, valor, concepto }) {
    return withTransaction(async (exec) => {
        const origenes = await exec(
            `SELECT c.id, c.numero_cuenta, c.saldo, ec.nombre AS estado_nombre
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             WHERE c.id = ? AND c.usuario_id = ?
             FOR UPDATE`,
            [cuenta_origen_id, usuarioId]
        );
        if (origenes.length === 0) {
            throw new AppError('Cuenta de origen no encontrada o no autorizada.', 404);
        }
        const cuentaOrigen = origenes[0];
        if (cuentaOrigen.estado_nombre !== 'ACTIVA') {
            throw new AppError('La cuenta de origen se encuentra bloqueada o inactiva.', 403);
        }
        if (parseFloat(cuentaOrigen.saldo) < valor) {
            throw new AppError(
                `Saldo insuficiente. Saldo disponible: $${parseFloat(cuentaOrigen.saldo).toLocaleString('es-CO')} COP.`,
                400
            );
        }

        const destinos = await exec(
            `SELECT c.id, c.numero_cuenta, c.saldo, ec.nombre AS estado_nombre, u.nombres, u.apellidos
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE c.numero_cuenta = ?
             FOR UPDATE`,
            [numero_cuenta_destino]
        );
        if (destinos.length === 0) {
            throw new AppError('La cuenta de destino no existe en el sistema bancario.', 404);
        }
        const cuentaDestino = destinos[0];
        if (cuentaDestino.id === cuentaOrigen.id) {
            throw new AppError('No puede realizar una transferencia a la misma cuenta de origen.', 400);
        }
        if (cuentaDestino.estado_nombre !== 'ACTIVA') {
            throw new AppError('La cuenta de destino se encuentra inactiva o bloqueada.', 403);
        }

        const nuevoSaldoOrigen = parseFloat(cuentaOrigen.saldo) - valor;
        const nuevoSaldoDestino = parseFloat(cuentaDestino.saldo) + valor;

        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldoOrigen, cuentaOrigen.id]);
        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldoDestino, cuentaDestino.id]);

        const descripOp = concepto && concepto.trim()
            ? concepto.trim().slice(0, 180)
            : `Transferencia a cuenta ${cuentaDestino.numero_cuenta}`;

        const resOp = await exec(
            `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
             VALUES (3, 1, 2, ?, ?, ?)`,
            [usuarioId, valor, descripOp]
        );
        const operacionId = resOp.insertId;

        await exec(
            `INSERT INTO transferencias (operacion_id, cuenta_origen_id, cuenta_destino_id)
             VALUES (?, ?, ?)`,
            [operacionId, cuentaOrigen.id, cuentaDestino.id]
        );
        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'DEBITO', ?)`,
            [operacionId, cuentaOrigen.id, nuevoSaldoOrigen]
        );
        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'CREDITO', ?)`,
            [operacionId, cuentaDestino.id, nuevoSaldoDestino]
        );

        return {
            numero_operacion: operacionId,
            fecha: new Date(),
            cuenta_origen: cuentaOrigen.numero_cuenta,
            cuenta_destino: cuentaDestino.numero_cuenta,
            titular_destino: `${cuentaDestino.nombres} ${cuentaDestino.apellidos}`,
            valor,
            nuevo_saldo: nuevoSaldoOrigen,
            nuevo_saldo_origen: nuevoSaldoOrigen,
        };
    });
}

async function actualizarTelefonoUsuario(usuarioId, telefono) {
    return executePrepared(`UPDATE usuarios SET telefono = ? WHERE id = ?`, [telefono || null, usuarioId]);
}

async function findCredencialesCambioPassword(usuarioId) {
    const usuarios = await executePrepared(
        `SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1`,
        [usuarioId]
    );
    const cuentas = await executePrepared(
        `SELECT id, pin_hash FROM cuentas WHERE usuario_id = ? AND estado_id = 1`,
        [usuarioId]
    );
    return {
        usuario: usuarios[0] || null,
        cuentas,
    };
}

async function actualizarPasswordHash(usuarioId, nuevoHash) {
    return executePrepared(`UPDATE usuarios SET password_hash = ? WHERE id = ?`, [nuevoHash, usuarioId]);
}

async function selectCuentaPorUsuarioParaUpdate(exec, cuenta_id, usuarioId, extraCols = '') {
    const cols = extraCols ? `, ${extraCols}` : '';
    if (cuenta_id) {
        return exec(
            `SELECT c.id, c.numero_cuenta, c.saldo${cols}, ec.nombre AS estado_nombre
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             WHERE c.id = ? AND c.usuario_id = ?
             LIMIT 1
             FOR UPDATE`,
            [cuenta_id, usuarioId]
        );
    }
    return exec(
        `SELECT c.id, c.numero_cuenta, c.saldo${cols}, ec.nombre AS estado_nombre
         FROM cuentas c
         JOIN estados_cuenta ec ON c.estado_id = ec.id
         WHERE c.usuario_id = ?
         ORDER BY c.id ASC
         LIMIT 1
         FOR UPDATE`,
        [usuarioId]
    );
}

async function procesarPagoTarjetaPos({ cuenta_id, usuarioId, valor, comercio, pin, verifyPin }) {
    return withTransaction(async (exec) => {
        const cuentas = await selectCuentaPorUsuarioParaUpdate(exec, cuenta_id, usuarioId, 'c.pin_hash');
        if (cuentas.length === 0) {
            throw new AppError('No se encontró la cuenta asociada a la tarjeta.', 404);
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            throw new AppError('La tarjeta o cuenta se encuentra inactiva o bloqueada.', 403);
        }
        if (pin) {
            const pinValido = await verifyPin(pin.toString().trim(), cuenta.pin_hash);
            if (!pinValido) {
                throw new AppError('PIN incorrecto. Transacción rechazada por el datáfono.', 401);
            }
        }
        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            throw new AppError(
                `Fondos insuficientes en la tarjeta. Saldo disponible: $${saldoActual.toLocaleString('es-CO')} COP.`,
                400
            );
        }

        const nuevoSaldo = saldoActual - valor;
        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldo, cuenta.id]);

        const opResult = await exec(
            `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
             VALUES (5, 1, 4, ?, ?, ?)`,
            [usuarioId, valor, `Compra POS Datáfono: ${comercio}`]
        );
        const operacionId = opResult.insertId;

        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'DEBITO', ?)`,
            [operacionId, cuenta.id, nuevoSaldo]
        );

        return {
            operacion_id: operacionId,
            autorizacion: `AUTH-${crypto.randomInt(100000, 1000000)}`,
            establecimiento: comercio,
            franquicia: 'VISA DÉBITO',
            monto: valor,
            nuevo_saldo: nuevoSaldo,
            fecha_hora: new Date(),
            numero_cuenta: cuenta.numero_cuenta,
        };
    });
}

async function retirarSaldoTarjeta({ usuarioId, cuenta_id, valor }) {
    return withTransaction(async (exec) => {
        const cuentas = await selectCuentaPorUsuarioParaUpdate(exec, cuenta_id, usuarioId);
        if (cuentas.length === 0) {
            throw new AppError('Cuenta no encontrada.', 404);
        }
        const cuenta = cuentas[0];
        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            throw new AppError(
                `Saldo insuficiente para retirar. Saldo: $${saldoActual.toLocaleString('es-CO')} COP.`,
                400
            );
        }
        const nuevoSaldo = saldoActual - valor;
        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldo, cuenta.id]);

        const opResult = await exec(
            `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
             VALUES (2, 1, 2, ?, ?, 'Traslado desde tarjeta')`,
            [usuarioId, valor]
        );
        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'DEBITO', ?)`,
            [opResult.insertId, cuenta.id, nuevoSaldo]
        );
        return nuevoSaldo;
    });
}

async function findCuentaActivaParaOtp(usuarioId, cuenta_id, numero_cuenta) {
    if (cuenta_id) {
        const rows = await executePrepared(
            `SELECT id, numero_cuenta, saldo FROM cuentas WHERE usuario_id = ? AND estado_id = 1 AND id = ? ORDER BY id ASC LIMIT 1`,
            [usuarioId, cuenta_id]
        );
        if (rows.length > 0) return rows[0];
    }
    if (numero_cuenta) {
        const rows = await executePrepared(
            `SELECT id, numero_cuenta, saldo FROM cuentas WHERE usuario_id = ? AND estado_id = 1 AND numero_cuenta = ? ORDER BY id ASC LIMIT 1`,
            [usuarioId, numero_cuenta.toString().trim()]
        );
        if (rows.length > 0) return rows[0];
    }
    const rows = await executePrepared(
        `SELECT id, numero_cuenta, saldo FROM cuentas WHERE usuario_id = ? AND estado_id = 1 ORDER BY id ASC LIMIT 1`,
        [usuarioId]
    );
    return rows[0] || null;
}

module.exports = {
    getResumenUsuario,
    getMovimientosCuenta,
    transferirEntreCuentas,
    actualizarTelefonoUsuario,
    findCredencialesCambioPassword,
    actualizarPasswordHash,
    procesarPagoTarjetaPos,
    retirarSaldoTarjeta,
    findCuentaActivaParaOtp,
};
