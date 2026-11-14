// src/controllers/cajeroController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { validarCodigoRetiro } = require('../config/otpStore');

function getCajero(req) {
    return req.session.cajero || req.session.cajeroCuenta;
}

// 1. Consultar saldo en pantalla del cajero
async function getSaldo(req, res) {
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });
        const cuentaId = cajero.id;

        const [cuentas] = await db.query(`
            SELECT c.id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
            FROM cuentas c
            JOIN tipos_cuenta tc ON c.tipo_id = tc.id
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE c.id = ?
        `, [cuentaId]);

        if (cuentas.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada.' });
        }

        const saldoActual = parseFloat(cuentas[0].saldo);
        cajero.saldo = saldoActual;

        const infoCuenta = {
            id: cuentaId,
            titular: cajero.titular,
            numero_cuenta: cuentas[0].numero_cuenta,
            tipo_cuenta: cuentas[0].tipo_cuenta,
            saldo: saldoActual
        };

        return res.json({
            cuenta: infoCuenta,
            ...infoCuenta
        });
    } catch (error) {
        console.error('Error en getSaldo cajero:', error);
        return res.status(500).json({ error: 'Error en terminal de cajero.' });
    }
}

// 2. Realizar retiro desde cajero automático (Transacción ACID)
async function retirar(req, res) {
    const connection = await db.getConnection();
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });
        const cuentaId = cajero.id;
        let { valor, codigoOtp } = req.body;

        valor = parseFloat(valor);
        if (!valor || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor a retirar debe ser mayor a cero ($0).' });
        }

        // Denominaciones de cajero
        if (valor % 10000 !== 0) {
            return res.status(400).json({ error: 'El valor debe ser múltiplo de $10.000 COP.' });
        }

        if (!codigoOtp) {
            return res.status(400).json({ error: 'Debe ingresar el código de retiro OTP de 6 dígitos para autorizar la operación.' });
        }

        const cleanOtp = codigoOtp.toString().trim();

        await connection.beginTransaction();

        // Bloqueo de fila para evitar condiciones de carrera (Race Condition)
        const [cuentas] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre, u.id AS usuario_id
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.id = ?
            FOR UPDATE
        `, [cuentaId]);

        if (cuentas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cuenta no encontrada.' });
        }

        const cuenta = cuentas[0];

        if (cuenta.estado_nombre !== 'ACTIVA') {
            await connection.rollback();
            return res.status(403).json({ error: 'La cuenta no se encuentra activa para retiros.' });
        }

        // Validación de Seguridad: Código OTP (6 dígitos) o PIN Físico (4 dígitos)
        let metodoRetiro = 'OTP Banca Rota';
        if (cleanOtp.length === 6) {
            const esOtpValido = validarCodigoRetiro(cleanOtp, cuenta.numero_cuenta, true);
            if (!esOtpValido) {
                await connection.rollback();
                return res.status(401).json({
                    error: 'Código de retiro OTP incorrecto o expirado. Genera un nuevo código en Banca Rota desde "Sacar plata".'
                });
            }
            metodoRetiro = 'OTP Banca Rota (Sin Tarjeta)';
        } else if (cleanOtp.length === 4) {
            const esPinValido = await bcrypt.compare(cleanOtp, cuenta.pin_hash);
            if (!esPinValido) {
                await connection.rollback();
                return res.status(401).json({ error: 'PIN de cajero de 4 dígitos incorrecto.' });
            }
            metodoRetiro = 'Tarjeta Débito (PIN)';
        } else {
            await connection.rollback();
            return res.status(400).json({ error: 'El código debe tener 6 dígitos (OTP) o 4 dígitos (PIN).' });
        }

        const saldoActual = parseFloat(cuenta.saldo);
        if (saldoActual < valor) {
            await connection.rollback();
            return res.status(400).json({
                error: `Fondos insuficientes. Su saldo disponible es de $${saldoActual.toLocaleString('es-CO')} COP.`
            });
        }

        const nuevoSaldo = saldoActual - valor;

        // 1. Actualizar saldo en MySQL
        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldo, cuentaId]);

        // 2. Registrar operación (Tipo 2: Retiro Cajero, Estado 1: Exitosa, Canal 1: Cajero Automático)
        const descripcionOp = `Retiro de efectivo en cajero (${metodoRetiro})`;
        const [resOp] = await connection.query(`
            INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
            VALUES (2, 1, 1, ?, ?, ?)
        `, [cuenta.usuario_id, valor, descripcionOp]);

        const operacionId = resOp.insertId;

        // 3. Registrar movimiento contable
        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, 'DEBITO', ?)
        `, [operacionId, cuentaId, nuevoSaldo]);

        await connection.commit();

        cajero.saldo = nuevoSaldo;

        return res.json({
            exito: true,
            mensaje: 'Retiro procesado exitosamente. Por favor tome su dinero y su comprobante.',
            recibo: {
                cajero_id: 'ATM-BOG-004',
                transaccion_id: operacionId,
                numero_operacion: operacionId,
                fecha: new Date(),
                numero_cuenta: cuenta.numero_cuenta,
                valor: valor,
                valor_retirado: valor,
                nuevo_saldo: nuevoSaldo,
                metodo_retiro: metodoRetiro
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en retirar cajero:', error);
        return res.status(500).json({ error: 'Error de comunicación con el dispensador de efectivo.' });
    } finally {
        connection.release();
    }
}

// 3. Consultar últimos movimientos en pantalla de cajero
async function getUltimosMovimientos(req, res) {
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });
        const cuentaId = cajero.id;

        const [movimientos] = await db.query(`
            SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante, m.creada_en AS fecha_hora,
                   o.descripcion, top.nombre AS tipo_operacion
            FROM movimientos m
            JOIN operaciones o ON m.operacion_id = o.id
            JOIN tipos_operacion top ON o.tipo_id = top.id
            WHERE m.cuenta_id = ?
            ORDER BY m.creada_en DESC, m.id DESC
            LIMIT 5
        `, [cuentaId]);

        return res.json({ movimientos });
    } catch (error) {
        console.error('Error en getUltimosMovimientos cajero:', error);
        return res.status(500).json({ error: 'Error al consultar movimientos en cajero.' });
    }
}

module.exports = {
    getSaldo,
    retirar,
    getUltimosMovimientos
};
