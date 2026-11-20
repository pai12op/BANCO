// src/repositories/adminRepository.js
// Acceso a datos administrativo: métricas, gestión de clientes, bloqueos, consignaciones y auditoría
const { executePrepared, withTransaction } = require('../config/db');
const { generarNumeroCuenta } = require('./authRepository');
const { AppError } = require('../utils/AppError');

async function getDashboardAdmin() {
    const [r1] = await executePrepared(`SELECT COUNT(*) AS total_clientes FROM usuarios WHERE rol_id = 2`);
    const [r2] = await executePrepared(`SELECT COUNT(*) AS cuentas_activas FROM cuentas WHERE estado_id = 1`);
    const [r3] = await executePrepared(`SELECT COUNT(*) AS clientes_bloqueados FROM usuarios WHERE rol_id = 2 AND estado_id = 3`);
    const [r4] = await executePrepared(`SELECT COUNT(*) AS cuentas_bloqueadas FROM cuentas WHERE estado_id = 3`);
    const [r5] = await executePrepared(`SELECT IFNULL(SUM(saldo), 0) AS saldo_total_banco FROM cuentas`);
    return {
        total_clientes: r1.total_clientes,
        cuentas_activas: r2.cuentas_activas,
        clientes_bloqueados: r3.clientes_bloqueados,
        cuentas_bloqueadas: r4.cuentas_bloqueadas,
        saldo_total_banco: parseFloat(r5.saldo_total_banco),
    };
}

async function getClientesAdmin(busqueda) {
    const baseSelect = `SELECT u.id, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono,
            DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
            td.codigo AS tipo_doc, eu.nombre AS estado, eu.id AS estado_id,
            c.id AS cuenta_id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
         FROM usuarios u
         JOIN tipos_documento td ON u.tipo_documento_id = td.id
         JOIN estados_usuario eu ON u.estado_id = eu.id
         LEFT JOIN cuentas c ON u.id = c.usuario_id
         LEFT JOIN tipos_cuenta tc ON c.tipo_id = tc.id
         LEFT JOIN estados_cuenta ec ON c.estado_id = ec.id`;

    if (busqueda && busqueda.trim()) {
        const term = `%${busqueda.trim()}%`;
        return executePrepared(
            `${baseSelect}
             WHERE u.rol_id = 2
               AND (u.numero_documento LIKE ? OR u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ? OR c.numero_cuenta LIKE ?)
             ORDER BY u.creado_en DESC`,
            [term, term, term, term, term]
        );
    }

    return executePrepared(
        `${baseSelect}
         WHERE u.rol_id = 2
         ORDER BY u.creado_en DESC`
    );
}

async function crearClienteAdmin({
    tipo_documento_id,
    numero_documento,
    nombres,
    apellidos,
    correo,
    telefono,
    fecha_nacimiento,
    passwordHash,
    pinHash,
    tipo_cuenta_id,
    saldoNum,
    adminId,
}) {
    return withTransaction(async (exec) => {
        const existentes = await exec(
            `SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)`,
            [correo, tipo_documento_id || 1, numero_documento]
        );
        if (existentes.length > 0) {
            throw new AppError('Ya existe un usuario registrado con ese correo o número de documento.', 400);
        }

        const resUser = await exec(
            `INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, fecha_nacimiento, password_hash, rol_id, estado_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, 1)`,
            [tipo_documento_id || 1, numero_documento, nombres, apellidos, correo, telefono || null, fecha_nacimiento || null, passwordHash]
        );
        const nuevoUsuarioId = resUser.insertId;
        const numeroCuenta = generarNumeroCuenta(tipo_cuenta_id);

        const resCuenta = await exec(
            `INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_id, estado_id, pin_hash, saldo)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [nuevoUsuarioId, numeroCuenta, tipo_cuenta_id || 1, pinHash, saldoNum]
        );
        const nuevaCuentaId = resCuenta.insertId;

        if (saldoNum > 0) {
            const resOp = await exec(
                `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
                 VALUES (1, 1, 3, ?, ?, 'Depósito de apertura de cuenta en ventanilla')`,
                [adminId, saldoNum]
            );
            await exec(
                `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
                 VALUES (?, ?, 'CREDITO', ?)`,
                [resOp.insertId, nuevaCuentaId, saldoNum]
            );
        }

        return {
            id: nuevoUsuarioId,
            nombres,
            apellidos,
            correo,
            numero_cuenta: numeroCuenta,
            saldo_inicial: saldoNum,
        };
    });
}

async function actualizarEstadoClienteAdmin(usuario_id, nuevo_estado_id) {
    return withTransaction(async (exec) => {
        await exec(`UPDATE usuarios SET estado_id = ? WHERE id = ? AND rol_id = 2`, [nuevo_estado_id, usuario_id]);
        const estadoCuenta = Number(nuevo_estado_id) === 3 ? 3 : Number(nuevo_estado_id) === 1 ? 1 : 2;
        await exec(`UPDATE cuentas SET estado_id = ? WHERE usuario_id = ?`, [estadoCuenta, usuario_id]);
    });
}

async function consignarEnCuentaAdmin({ adminId, numero_cuenta, valor, concepto }) {
    return withTransaction(async (exec) => {
        const cuentas = await exec(
            `SELECT c.id, c.numero_cuenta, c.saldo, ec.nombre AS estado_nombre, u.nombres, u.apellidos
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE c.numero_cuenta = ?
             FOR UPDATE`,
            [numero_cuenta]
        );
        if (cuentas.length === 0) {
            throw new AppError('La cuenta bancaria no existe.', 404);
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            throw new AppError(`La cuenta se encuentra ${cuenta.estado_nombre}. No se permiten consignaciones.`, 403);
        }

        const saldoActual = parseFloat(cuenta.saldo);
        const nuevoSaldo = saldoActual + valor;
        await exec(`UPDATE cuentas SET saldo = ? WHERE id = ?`, [nuevoSaldo, cuenta.id]);

        const descripOp = concepto && concepto.trim()
            ? concepto.trim().slice(0, 180)
            : `Consignación en ventanilla administrativa por $${valor.toLocaleString('es-CO')}`;

        const resOp = await exec(
            `INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
             VALUES (1, 1, 3, ?, ?, ?)`,
            [adminId, valor, descripOp]
        );
        const operacionId = resOp.insertId;

        await exec(
            `INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
             VALUES (?, ?, 'CREDITO', ?)`,
            [operacionId, cuenta.id, nuevoSaldo]
        );

        return {
            transaccion_id: operacionId,
            id_movimiento: operacionId,
            fecha: new Date(),
            numero_cuenta: cuenta.numero_cuenta,
            cuenta: cuenta.numero_cuenta,
            titular: `${cuenta.nombres} ${cuenta.apellidos}`,
            concepto: descripOp,
            valor_consignado: valor,
            nuevo_saldo: nuevoSaldo,
        };
    });
}

async function getHistorialGeneralAdmin() {
    return executePrepared(
        `SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante,
                m.creada_en AS fecha_hora, m.creada_en AS fecha,
                c.numero_cuenta, u.nombres, u.apellidos,
                CONCAT(u.nombres, ' ', u.apellidos) AS titular,
                o.descripcion, top.nombre AS tipo_operacion, can.nombre AS canal
         FROM movimientos m
         JOIN cuentas c ON m.cuenta_id = c.id
         JOIN usuarios u ON c.usuario_id = u.id
         JOIN operaciones o ON m.operacion_id = o.id
         JOIN tipos_operacion top ON o.tipo_id = top.id
         JOIN canales can ON o.canal_id = can.id
         ORDER BY m.creada_en DESC, m.id DESC
         LIMIT 50`
    );
}

async function eliminarClienteAdmin(usuario_id) {
    return withTransaction(async (exec) => {
        const users = await exec(
            `SELECT u.id, u.nombres, u.apellidos, u.correo, u.rol_id, c.id AS cuenta_id, c.numero_cuenta
             FROM usuarios u
             LEFT JOIN cuentas c ON u.id = c.usuario_id
             WHERE u.id = ?`,
            [usuario_id]
        );

        if (!users || users.length === 0) {
            throw new AppError('El usuario o cliente no existe.', 404);
        }

        const user = users[0];
        if (Number(user.rol_id) === 1) {
            throw new AppError('Acción denegada: No está permitido eliminar usuarios administradores del banco.', 403);
        }

        const cuentaIds = users.filter((u) => u.cuenta_id).map((u) => u.cuenta_id);

        if (cuentaIds.length > 0) {
            const placeholders = cuentaIds.map(() => '?').join(',');

            // 1. Obtener IDs de operaciones asociadas a los movimientos de estas cuentas
            const movOps = await exec(
                `SELECT DISTINCT operacion_id FROM movimientos WHERE cuenta_id IN (${placeholders})`,
                cuentaIds
            );
            const opIdsFromMovs = movOps.map((m) => m.operacion_id);

            // 2. Obtener IDs de operaciones de transferencias vinculadas a estas cuentas
            const transOps = await exec(
                `SELECT DISTINCT operacion_id FROM transferencias WHERE cuenta_origen_id IN (${placeholders}) OR cuenta_destino_id IN (${placeholders})`,
                [...cuentaIds, ...cuentaIds]
            );
            const opIdsFromTrans = transOps.map((t) => t.operacion_id);

            const allOpIds = Array.from(new Set([...opIdsFromMovs, ...opIdsFromTrans]));

            // 3. Eliminar registros de transferencias relacionadas
            await exec(
                `DELETE FROM transferencias WHERE cuenta_origen_id IN (${placeholders}) OR cuenta_destino_id IN (${placeholders})`,
                [...cuentaIds, ...cuentaIds]
            );

            // 4. Eliminar movimientos contables de estas cuentas
            await exec(
                `DELETE FROM movimientos WHERE cuenta_id IN (${placeholders})`,
                cuentaIds
            );

            // 5. Eliminar operaciones huérfanas
            if (allOpIds.length > 0) {
                const opPlaceholders = allOpIds.map(() => '?').join(',');
                await exec(
                    `DELETE FROM operaciones WHERE id IN (${opPlaceholders})`,
                    allOpIds
                );
            }

            // 6. Eliminar cuentas bancarias del cliente
            await exec(
                `DELETE FROM cuentas WHERE id IN (${placeholders})`,
                cuentaIds
            );
        }

        // 7. Limpiar operaciones donde el usuario figure como realizado_por
        await exec(
            `UPDATE operaciones SET realizado_por = NULL WHERE realizado_por = ?`,
            [usuario_id]
        );

        // 8. Eliminar notificaciones del usuario
        await exec(
            `DELETE FROM notificaciones WHERE usuario_id = ?`,
            [usuario_id]
        );

        // 9. Eliminar usuario finalmente
        await exec(
            `DELETE FROM usuarios WHERE id = ? AND rol_id = 2`,
            [usuario_id]
        );

        return {
            id: user.id,
            titular: `${user.nombres} ${user.apellidos}`,
            correo: user.correo,
            numero_cuenta: user.numero_cuenta,
        };
    });
}

module.exports = {
    getDashboardAdmin,
    getClientesAdmin,
    crearClienteAdmin,
    actualizarEstadoClienteAdmin,
    consignarEnCuentaAdmin,
    getHistorialGeneralAdmin,
    eliminarClienteAdmin,
};
