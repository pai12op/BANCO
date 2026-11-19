// src/repositories/bankRepository.js
// Capa única de acceso a datos con sentencias preparadas binarias (Cero consultas SQL concatenadas)
const crypto = require('crypto');
const { executePrepared, withTransaction } = require('../config/db');

function generarNumeroCuenta(tipoCuentaId, esBancoCorazones = false) {
    const prefix = esBancoCorazones
        ? (Number(tipoCuentaId) === 2 ? '7002' : '7001')
        : (Number(tipoCuentaId) === 2 ? '5001' : '4001');
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
    esBancoCorazones = false,
}) {
    return withTransaction(async (exec) => {
        const existentes = await exec(
            `SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)`,
            [correo, tipo_documento_id || 1, numero_documento]
        );
        if (existentes.length > 0) {
            const err = new Error('Ya existe una cuenta registrada con este correo o número de documento.');
            err.statusCode = 400;
            throw err;
        }

        const resUser = await exec(
            `INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, password_hash, rol_id, estado_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)`,
            [tipo_documento_id || 1, numero_documento, nombres, apellidos, correo, telefono || null, passwordHash]
        );
        const nuevoUsuarioId = resUser.insertId;
        const numeroCuenta = generarNumeroCuenta(tipo_cuenta_id, esBancoCorazones);

        // Regla estricta de negocio: todo registro público de cliente inicia en $0.00
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
    if (verif.length === 0) {
        return null;
    }

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
            const err = new Error('Cuenta de origen no encontrada o no autorizada.');
            err.statusCode = 404;
            throw err;
        }
        const cuentaOrigen = origenes[0];
        if (cuentaOrigen.estado_nombre !== 'ACTIVA') {
            const err = new Error('La cuenta de origen se encuentra bloqueada o inactiva.');
            err.statusCode = 403;
            throw err;
        }
        if (parseFloat(cuentaOrigen.saldo) < valor) {
            const err = new Error(`Saldo insuficiente. Saldo disponible: $${parseFloat(cuentaOrigen.saldo).toLocaleString('es-CO')} COP.`);
            err.statusCode = 400;
            throw err;
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
            const err = new Error('La cuenta de destino no existe en el sistema bancario.');
            err.statusCode = 404;
            throw err;
        }
        const cuentaDestino = destinos[0];
        if (cuentaDestino.id === cuentaOrigen.id) {
            const err = new Error('No puede realizar una transferencia a la misma cuenta de origen.');
            err.statusCode = 400;
            throw err;
        }
        if (cuentaDestino.estado_nombre !== 'ACTIVA') {
            const err = new Error('La cuenta de destino se encuentra inactiva o bloqueada.');
            err.statusCode = 403;
            throw err;
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

async function findCuentaParaPos({ cuenta_id, usuarioId }) {
    if (cuenta_id) {
        return executePrepared(
            `SELECT c.id, c.numero_cuenta, c.saldo, c.pin_hash, ec.nombre AS estado_nombre
             FROM cuentas c
             JOIN estados_cuenta ec ON c.estado_id = ec.id
             WHERE c.id = ? AND c.usuario_id = ?
             LIMIT 1`,
            [cuenta_id, usuarioId]
        );
    }
    return executePrepared(
        `SELECT c.id, c.numero_cuenta, c.saldo, c.pin_hash, ec.nombre AS estado_nombre
         FROM cuentas c
         JOIN estados_cuenta ec ON c.estado_id = ec.id
         WHERE c.usuario_id = ?
         ORDER BY c.id ASC
         LIMIT 1`,
        [usuarioId]
    );
}

async function procesarPagoTarjetaPos({ cuenta_id, usuarioId, valor, comercio, pin, bcrypt }) {
    return withTransaction(async (exec) => {
        const cuentas = cuenta_id
            ? await exec(
                `SELECT c.id, c.numero_cuenta, c.saldo, c.pin_hash, ec.nombre AS estado_nombre
                 FROM cuentas c
                 JOIN estados_cuenta ec ON c.estado_id = ec.id
                 WHERE c.id = ? AND c.usuario_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [cuenta_id, usuarioId]
            )
            : await exec(
                `SELECT c.id, c.numero_cuenta, c.saldo, c.pin_hash, ec.nombre AS estado_nombre
                 FROM cuentas c
                 JOIN estados_cuenta ec ON c.estado_id = ec.id
                 WHERE c.usuario_id = ?
                 ORDER BY c.id ASC
                 LIMIT 1
                 FOR UPDATE`,
                [usuarioId]
            );

        if (cuentas.length === 0) {
            const err = new Error('No se encontró la cuenta asociada a la tarjeta.');
            err.statusCode = 404;
            throw err;
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            const err = new Error('La tarjeta o cuenta se encuentra inactiva o bloqueada.');
            err.statusCode = 403;
            throw err;
        }
        if (pin) {
            const pinValido = await bcrypt.compare(pin.toString().trim(), cuenta.pin_hash);
            if (!pinValido) {
                const err = new Error('PIN incorrecto. Transacción rechazada por el datáfono.');
                err.statusCode = 401;
                throw err;
            }
        }
        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            const err = new Error(`Fondos insuficientes en la tarjeta. Saldo disponible: $${saldoActual.toLocaleString('es-CO')} COP.`);
            err.statusCode = 400;
            throw err;
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
        const cuentas = cuenta_id
            ? await exec(
                `SELECT c.id, c.saldo FROM cuentas c WHERE c.id = ? AND c.usuario_id = ? LIMIT 1 FOR UPDATE`,
                [cuenta_id, usuarioId]
            )
            : await exec(
                `SELECT c.id, c.saldo FROM cuentas c WHERE c.usuario_id = ? ORDER BY c.id ASC LIMIT 1 FOR UPDATE`,
                [usuarioId]
            );
        if (cuentas.length === 0) {
            const err = new Error('Cuenta no encontrada.');
            err.statusCode = 404;
            throw err;
        }
        const cuenta = cuentas[0];
        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            const err = new Error(`Saldo insuficiente para retirar. Saldo: $${saldoActual.toLocaleString('es-CO')} COP.`);
            err.statusCode = 400;
            throw err;
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

async function retirarPorCajero({ cuentaId, valor, cleanOtp, validarCodigoRetiro, bcrypt, labelBanco }) {
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
            const err = new Error('Cuenta no encontrada.');
            err.statusCode = 404;
            throw err;
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            const err = new Error('La cuenta no se encuentra activa para retiros.');
            err.statusCode = 403;
            throw err;
        }

        let metodoRetiro = `OTP ${labelBanco}`;
        if (cleanOtp.length === 6) {
            const esOtpValido = validarCodigoRetiro(cleanOtp, cuenta.numero_cuenta, true);
            if (!esOtpValido) {
                const err = new Error(`Código de retiro OTP incorrecto o expirado. Genera un nuevo código en ${labelBanco}.`);
                err.statusCode = 401;
                throw err;
            }
            metodoRetiro = `OTP ${labelBanco} (Sin Tarjeta)`;
        } else if (cleanOtp.length === 4) {
            const esPinValido = await bcrypt.compare(cleanOtp, cuenta.pin_hash);
            if (!esPinValido) {
                const err = new Error('PIN de cajero de 4 dígitos incorrecto.');
                err.statusCode = 401;
                throw err;
            }
            metodoRetiro = 'Tarjeta Débito (PIN)';
        } else {
            const err = new Error('El código debe tener 6 dígitos (OTP) o 4 dígitos (PIN).');
            err.statusCode = 400;
            throw err;
        }

        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            const err = new Error(`Fondos insuficientes. Su saldo disponible es de $${saldoActual.toLocaleString('es-CO')} COP.`);
            err.statusCode = 400;
            throw err;
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
    if (busqueda && busqueda.trim()) {
        const term = `%${busqueda.trim()}%`;
        return executePrepared(
            `SELECT u.id, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono,
                    td.codigo AS tipo_doc, eu.nombre AS estado, eu.id AS estado_id,
                    c.id AS cuenta_id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
             FROM usuarios u
             JOIN tipos_documento td ON u.tipo_documento_id = td.id
             JOIN estados_usuario eu ON u.estado_id = eu.id
             LEFT JOIN cuentas c ON u.id = c.usuario_id
             LEFT JOIN tipos_cuenta tc ON c.tipo_id = tc.id
             LEFT JOIN estados_cuenta ec ON c.estado_id = ec.id
             WHERE u.rol_id = 2
               AND (u.numero_documento LIKE ? OR u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ? OR c.numero_cuenta LIKE ?)
             ORDER BY u.creado_en DESC`,
            [term, term, term, term, term]
        );
    }

    return executePrepared(
        `SELECT u.id, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono,
                td.codigo AS tipo_doc, eu.nombre AS estado, eu.id AS estado_id,
                c.id AS cuenta_id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
         FROM usuarios u
         JOIN tipos_documento td ON u.tipo_documento_id = td.id
         JOIN estados_usuario eu ON u.estado_id = eu.id
         LEFT JOIN cuentas c ON u.id = c.usuario_id
         LEFT JOIN tipos_cuenta tc ON c.tipo_id = tc.id
         LEFT JOIN estados_cuenta ec ON c.estado_id = ec.id
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
    passwordHash,
    pinHash,
    tipo_cuenta_id,
    saldoNum,
    adminId,
    esBancoCorazones = false,
}) {
    return withTransaction(async (exec) => {
        const existentes = await exec(
            `SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)`,
            [correo, tipo_documento_id || 1, numero_documento]
        );
        if (existentes.length > 0) {
            const err = new Error('Ya existe un usuario registrado con ese correo o número de documento.');
            err.statusCode = 400;
            throw err;
        }

        const resUser = await exec(
            `INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, password_hash, rol_id, estado_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)`,
            [tipo_documento_id || 1, numero_documento, nombres, apellidos, correo, telefono || null, passwordHash]
        );
        const nuevoUsuarioId = resUser.insertId;
        const numeroCuenta = generarNumeroCuenta(tipo_cuenta_id, esBancoCorazones);

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
            const err = new Error('La cuenta bancaria no existe.');
            err.statusCode = 404;
            throw err;
        }
        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            const err = new Error(`La cuenta se encuentra ${cuenta.estado_nombre}. No se permiten consignaciones.`);
            err.statusCode = 403;
            throw err;
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

module.exports = {
    findClienteLogin,
    findAdminPorCorreo,
    findCuentasSegurasPorUsuario,
    findCuentaParaCajero,
    registrarClienteConSaldoCero,
    getResumenUsuario,
    getMovimientosCuenta,
    transferirEntreCuentas,
    actualizarTelefonoUsuario,
    findCredencialesCambioPassword,
    actualizarPasswordHash,
    findCuentaParaPos,
    procesarPagoTarjetaPos,
    retirarSaldoTarjeta,
    findCuentaActivaParaOtp,
    getSaldoCajero,
    retirarPorCajero,
    getUltimosMovimientosCajero,
    getDashboardAdmin,
    getClientesAdmin,
    crearClienteAdmin,
    actualizarEstadoClienteAdmin,
    consignarEnCuentaAdmin,
    getHistorialGeneralAdmin,
};
