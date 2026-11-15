// src/controllers/usuarioController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generarCodigoRetiro } = require('../config/otpStore');

function getCliente(req) {
    return req.session.cliente || req.session.usuario;
}

// 1. Obtener resumen de cuentas y saldo del cliente autenticado
async function getResumen(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;

        const [cuentas] = await db.query(`
            SELECT c.id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
            FROM cuentas c
            JOIN tipos_cuenta tc ON c.tipo_id = tc.id
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE c.usuario_id = ?
        `, [usuarioId]);

        const [usuario] = await db.query(`
            SELECT u.id, u.nombres, u.apellidos, u.correo, u.telefono, u.numero_documento, td.codigo AS tipo_documento
            FROM usuarios u
            JOIN tipos_documento td ON u.tipo_documento_id = td.id
            WHERE u.id = ?
        `, [usuarioId]);

        return res.json({
            usuario: usuario[0],
            cuentas
        });
    } catch (error) {
        console.error('Error en getResumen:', error);
        return res.status(500).json({ error: 'Error al consultar resumen financiero.' });
    }
}

// 2. Historial de movimientos de una cuenta (exigido en PDF: Fecha, Tipo, Descripción, Valor, Saldo Resultante)
async function getMovimientos(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        const cuentaId = req.query.cuenta_id || cliente.cuenta_principal_id;

        // Validar que la cuenta pertenezca al usuario logueado (Regla de negocio: no ver cuentas ajenas)
        const [verif] = await db.query('SELECT id, numero_cuenta, saldo FROM cuentas WHERE id = ? AND usuario_id = ?', [cuentaId, usuarioId]);
        if (verif.length === 0) {
            return res.status(403).json({ error: 'Acceso denegado a la cuenta solicitada.' });
        }

        const [movimientos] = await db.query(`
            SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante, m.creada_en AS fecha_hora,
                   o.descripcion, top.nombre AS tipo_operacion, can.nombre AS canal
            FROM movimientos m
            JOIN operaciones o ON m.operacion_id = o.id
            JOIN tipos_operacion top ON o.tipo_id = top.id
            JOIN canales can ON o.canal_id = can.id
            WHERE m.cuenta_id = ?
            ORDER BY m.creada_en DESC, m.id DESC
        `, [cuentaId]);

        return res.json({
            cuenta: verif[0],
            movimientos
        });
    } catch (error) {
        console.error('Error en getMovimientos:', error);
        return res.status(500).json({ error: 'Error al consultar historial de movimientos.' });
    }
}

// 3. Realizar transferencia entre cuentas (Transacción ACID con bloqueo)
async function transferir(req, res) {
    const connection = await db.getConnection();
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        let { cuenta_origen_id, numero_cuenta_destino, valor, concepto } = req.body;

        valor = parseFloat(valor);
        if (!valor || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor de la transferencia debe ser mayor a cero ($0).' });
        }

        if (!numero_cuenta_destino) {
            return res.status(400).json({ error: 'Debe ingresar el número de cuenta de destino.' });
        }

        numero_cuenta_destino = String(numero_cuenta_destino).trim().replace(/\D/g, '');

        if (!numero_cuenta_destino) {
            return res.status(400).json({ error: 'El número de cuenta de destino no es válido.' });
        }

        await connection.beginTransaction();

        // 1. Validar cuenta origen (debe ser del usuario y estar activa)
        const [origenes] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE c.id = ? AND c.usuario_id = ?
            FOR UPDATE
        `, [cuenta_origen_id, usuarioId]);

        if (origenes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cuenta de origen no encontrada o no autorizada.' });
        }

        const cuentaOrigen = origenes[0];
        if (cuentaOrigen.estado_nombre !== 'ACTIVA') {
            await connection.rollback();
            return res.status(403).json({ error: 'La cuenta de origen se encuentra bloqueada o inactiva.' });
        }

        // 2. Validar saldo suficiente
        if (parseFloat(cuentaOrigen.saldo) < valor) {
            await connection.rollback();
            return res.status(400).json({ error: `Saldo insuficiente. Saldo disponible: $${parseFloat(cuentaOrigen.saldo).toLocaleString('es-CO')} COP.` });
        }

        // 3. Validar cuenta destino (existencia y estado activo)
        const [destinos] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre, u.nombres, u.apellidos
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.numero_cuenta = ?
            FOR UPDATE
        `, [numero_cuenta_destino]);

        if (destinos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'La cuenta de destino no existe en el sistema bancario.' });
        }

        const cuentaDestino = destinos[0];
        if (cuentaDestino.id === cuentaOrigen.id) {
            await connection.rollback();
            return res.status(400).json({ error: 'No puede realizar una transferencia a la misma cuenta de origen.' });
        }

        if (cuentaDestino.estado_nombre !== 'ACTIVA') {
            await connection.rollback();
            return res.status(403).json({ error: 'La cuenta de destino se encuentra inactiva o bloqueada.' });
        }

        // 4. Calcular nuevos saldos
        const nuevoSaldoOrigen = parseFloat(cuentaOrigen.saldo) - valor;
        const nuevoSaldoDestino = parseFloat(cuentaDestino.saldo) + valor;

        // 5. Actualizar saldos en MySQL
        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldoOrigen, cuentaOrigen.id]);
        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldoDestino, cuentaDestino.id]);

        // 6. Registrar en operaciones generales
        const descripOp = concepto && concepto.trim() ? concepto.trim() : `Transferencia a cuenta ${cuentaDestino.numero_cuenta}`;
        const [resOp] = await connection.query(`
            INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
            VALUES (3, 1, 2, ?, ?, ?)
        `, [usuarioId, valor, descripOp]);

        const operacionId = resOp.insertId;

        // 7. Registrar en tabla transferencias
        await connection.query(`
            INSERT INTO transferencias (operacion_id, cuenta_origen_id, cuenta_destino_id)
            VALUES (?, ?, ?)
        `, [operacionId, cuentaOrigen.id, cuentaDestino.id]);

        // 8. Registrar los dos movimientos contables (Asiento doble)
        // Débito en origen
        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, 'DEBITO', ?)
        `, [operacionId, cuentaOrigen.id, nuevoSaldoOrigen]);

        // Crédito en destino
        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, 'CREDITO', ?)
        `, [operacionId, cuentaDestino.id, nuevoSaldoDestino]);

        await connection.commit();

        return res.json({
            exito: true,
            mensaje: 'Transferencia realizada con éxito.',
            comprobante: {
                numero_operacion: operacionId,
                fecha: new Date(),
                cuenta_origen: cuentaOrigen.numero_cuenta,
                cuenta_destino: cuentaDestino.numero_cuenta,
                titular_destino: `${cuentaDestino.nombres} ${cuentaDestino.apellidos}`,
                valor,
                nuevo_saldo: nuevoSaldoOrigen,
                nuevo_saldo_origen: nuevoSaldoOrigen
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en transferir:', error);
        return res.status(500).json({ error: 'Ocurrió un error al procesar la transferencia.' });
    } finally {
        connection.release();
    }
}

// 4. Modificar perfil (teléfono)
async function actualizarPerfil(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        const { telefono } = req.body;

        await db.query('UPDATE usuarios SET telefono = ? WHERE id = ?', [telefono ? telefono.trim() : null, usuarioId]);
        if (req.session.cliente) req.session.cliente.telefono = telefono;
        if (req.session.usuario) req.session.usuario.telefono = telefono;

        return res.json({ mensaje: 'Información de perfil actualizada exitosamente.' });
    } catch (error) {
        console.error('Error en actualizarPerfil:', error);
        return res.status(500).json({ error: 'Error al actualizar perfil.' });
    }
}

// 5. Cambiar contraseña
async function cambiarPassword(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        const { password_actual, password_nuevo } = req.body;

        if (!password_actual || !password_nuevo) {
            return res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
        }

        if (password_nuevo.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
        }

        const [usuarios] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [usuarioId]);
        const passwordValido = await bcrypt.compare(password_actual, usuarios[0].password_hash);
        if (!passwordValido) {
            return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
        }

        const nuevoHash = await bcrypt.hash(password_nuevo, 10);
        await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, usuarioId]);

        return res.json({ mensaje: 'Contraseña modificada exitosamente.' });
    } catch (error) {
        console.error('Error en cambiarPassword:', error);
        return res.status(500).json({ error: 'Error al cambiar contraseña.' });
    }
}

// 6. Simular pago en Datáfono (Compra POS con Tarjeta)
async function pagoTarjeta(req, res) {
    const connection = await db.getConnection();
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        let { cuenta_id, valor, establecimiento, pin } = req.body;

        valor = parseFloat(valor);
        if (!valor || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El monto de la compra debe ser mayor a $0.' });
        }

        const comercio = establecimiento && establecimiento.trim() ? establecimiento.trim() : 'Establecimiento Comercial (POS Datáfono)';

        await connection.beginTransaction();

        // Obtener la cuenta y bloquear fila
        const [cuentas] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE (c.id = ? OR (? IS NULL AND c.usuario_id = ?)) AND c.usuario_id = ?
            ORDER BY c.id ASC LIMIT 1
            FOR UPDATE
        `, [cuenta_id || null, cuenta_id || null, usuarioId, usuarioId]);

        if (cuentas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'No se encontró la cuenta asociada a la tarjeta.' });
        }

        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            await connection.rollback();
            return res.status(403).json({ error: 'La tarjeta o cuenta se encuentra inactiva o bloqueada.' });
        }

        // Validación de PIN en el datáfono si se provee
        if (pin) {
            const pinValido = await bcrypt.compare(pin.toString().trim(), cuenta.pin_hash);
            if (!pinValido) {
                await connection.rollback();
                return res.status(401).json({ error: 'PIN incorrecto. Transacción rechazada por el datáfono.' });
            }
        }

        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            await connection.rollback();
            return res.status(400).json({
                error: `Fondos insuficientes en la tarjeta. Saldo disponible: $${saldoActual.toLocaleString('es-CO')} COP.`
            });
        }

        const nuevoSaldo = saldoActual - valor;

        // Actualizar saldo
        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldo, cuenta.id]);

        // Registrar operación
        const [opResult] = await connection.query(`
            INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
            VALUES (5, 1, 4, ?, ?, ?)
        `, [usuarioId, valor, `Compra POS Datáfono: ${comercio}`]);

        const operacionId = opResult.insertId;

        // Registrar movimiento contable
        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, 'DEBITO', ?)
        `, [operacionId, cuenta.id, nuevoSaldo]);

        await connection.commit();

        return res.json({
            mensaje: '¡Pago aprobado en datáfono exitosamente!',
            comprobante: {
                operacion_id: operacionId,
                autorizacion: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
                establecimiento: comercio,
                franquicia: 'VISA DÉBITO',
                monto: valor,
                nuevo_saldo: nuevoSaldo,
                fecha_hora: new Date(),
                numero_cuenta: cuenta.numero_cuenta
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en pagoTarjeta:', error);
        return res.status(500).json({ error: 'Error al procesar el pago con la tarjeta.' });
    } finally {
        connection.release();
    }
}

// 7. Poner o quitar plata de la tarjeta
async function ajustarPlataTarjeta(req, res) {
    const connection = await db.getConnection();
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const usuarioId = cliente.id;
        let { cuenta_id, valor, tipo } = req.body; // tipo: 'PONER' o 'QUITAR'

        valor = parseFloat(valor);
        if (!valor || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor debe ser superior a $0 COP.' });
        }

        await connection.beginTransaction();

        const [cuentas] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE (c.id = ? OR (? IS NULL AND c.usuario_id = ?)) AND c.usuario_id = ?
            ORDER BY c.id ASC LIMIT 1
            FOR UPDATE
        `, [cuenta_id || null, cuenta_id || null, usuarioId, usuarioId]);

        if (cuentas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cuenta no encontrada.' });
        }

        const cuenta = cuentas[0];
        const saldoActual = parseFloat(cuenta.saldo);

        let nuevoSaldo = saldoActual;
        let sentido = 'CREDITO';
        let desc = 'Recarga de tarjeta (Pon plata)';
        let tipoId = 1;

        if (tipo === 'QUITAR') {
            if (saldoActual < valor) {
                await connection.rollback();
                return res.status(400).json({ error: `Saldo insuficiente para retirar. Saldo: $${saldoActual.toLocaleString('es-CO')} COP.` });
            }
            nuevoSaldo = saldoActual - valor;
            sentido = 'DEBITO';
            desc = 'Traslado desde tarjeta (Quita plata)';
            tipoId = 2;
        } else {
            nuevoSaldo = saldoActual + valor;
        }

        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldo, cuenta.id]);

        const [opResult] = await connection.query(`
            INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
            VALUES (?, 1, 2, ?, ?, ?)
        `, [tipoId, usuarioId, valor, desc]);

        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, ?, ?)
        `, [opResult.insertId, cuenta.id, sentido, nuevoSaldo]);

        await connection.commit();

        return res.json({
            mensaje: tipo === 'QUITAR' ? `Se retiraron $${valor.toLocaleString('es-CO')} COP de la tarjeta.` : `¡Has cargado $${valor.toLocaleString('es-CO')} COP a tu tarjeta!`,
            nuevo_saldo: nuevoSaldo
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en ajustarPlataTarjeta:', error);
        return res.status(500).json({ error: 'Error al actualizar el saldo de la tarjeta.' });
    } finally {
        connection.release();
    }
}

// 8. Generar código OTP de 6 dígitos para sacar dinero en cajero ATM
async function solicitarCodigoRetiro(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión en la Banca Virtual.' });
        const usuarioId = cliente.id;

        const { cuenta_id, numero_cuenta } = req.body || {};

        let query = 'SELECT id, numero_cuenta, saldo FROM cuentas WHERE usuario_id = ? AND estado_id = 1';
        let params = [usuarioId];

        if (cuenta_id) {
            query += ' AND id = ?';
            params.push(cuenta_id);
        } else if (numero_cuenta) {
            query += ' AND numero_cuenta = ?';
            params.push(numero_cuenta.toString().trim());
        }
        query += ' ORDER BY id ASC LIMIT 1';

        let [cuentas] = await db.query(query, params);

        // Si no encontró por id/número específico, buscar cualquier cuenta activa del usuario
        if (cuentas.length === 0) {
            [cuentas] = await db.query(
                'SELECT id, numero_cuenta, saldo FROM cuentas WHERE usuario_id = ? AND estado_id = 1 ORDER BY id ASC LIMIT 1',
                [usuarioId]
            );
        }

        if (cuentas.length === 0) {
            return res.status(404).json({ error: 'No se encontró cuenta activa para generar código de retiro.' });
        }

        const cuenta = cuentas[0];
        const { codigo, expiraMinutos } = generarCodigoRetiro(usuarioId, cuenta.id, cuenta.numero_cuenta);

        return res.json({
            mensaje: 'Código de retiro para cajero ATM generado exitosamente.',
            codigo,
            expira_minutos: expiraMinutos,
            numero_cuenta: cuenta.numero_cuenta,
            saldo: parseFloat(cuenta.saldo)
        });
    } catch (error) {
        console.error('Error al generar código de retiro:', error);
        return res.status(500).json({ error: 'Error al generar código de retiro.' });
    }
}

module.exports = {
    getResumen,
    getMovimientos,
    transferir,
    actualizarPerfil,
    cambiarPassword,
    pagoTarjeta,
    ajustarPlataTarjeta,
    solicitarCodigoRetiro
};
