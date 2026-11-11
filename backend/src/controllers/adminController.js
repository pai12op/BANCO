// src/controllers/adminController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Dashboard administrativo con los 4 indicadores clave del PDF
async function getDashboard(req, res) {
    try {
        // Total clientes (rol_id = 2)
        const [[{ total_clientes }]] = await db.query('SELECT COUNT(*) AS total_clientes FROM usuarios WHERE rol_id = 2');

        // Cuentas activas
        const [[{ cuentas_activas }]] = await db.query('SELECT COUNT(*) AS cuentas_activas FROM cuentas WHERE estado_id = 1');

        // Clientes o cuentas bloqueadas
        const [[{ clientes_bloqueados }]] = await db.query('SELECT COUNT(*) AS clientes_bloqueados FROM usuarios WHERE rol_id = 2 AND estado_id = 3');
        const [[{ cuentas_bloqueadas }]] = await db.query('SELECT COUNT(*) AS cuentas_bloqueadas FROM cuentas WHERE estado_id = 3');

        // Suma total de los saldos almacenados en las cuentas
        const [[{ saldo_total_banco }]] = await db.query('SELECT IFNULL(SUM(saldo), 0) AS saldo_total_banco FROM cuentas');

        return res.json({
            total_clientes,
            cuentas_activas,
            clientes_bloqueados,
            cuentas_bloqueadas,
            saldo_total_banco: parseFloat(saldo_total_banco)
        });
    } catch (error) {
        console.error('Error en getDashboard:', error);
        return res.status(500).json({ error: 'Error al cargar métricas del dashboard.' });
    }
}

// 2. Listar y buscar clientes
async function getClientes(req, res) {
    try {
        const { busqueda } = req.query;
        let query = `
            SELECT u.id, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono,
                   td.codigo AS tipo_doc, eu.nombre AS estado, eu.id AS estado_id,
                   c.id AS cuenta_id, c.numero_cuenta, c.saldo, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
            FROM usuarios u
            JOIN tipos_documento td ON u.tipo_documento_id = td.id
            JOIN estados_usuario eu ON u.estado_id = eu.id
            LEFT JOIN cuentas c ON u.id = c.usuario_id
            LEFT JOIN tipos_cuenta tc ON c.tipo_id = tc.id
            LEFT JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE u.rol_id = 2
        `;
        const params = [];

        if (busqueda && busqueda.trim()) {
            query += ` AND (u.numero_documento LIKE ? OR u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ? OR c.numero_cuenta LIKE ?)`;
            const term = `%${busqueda.trim()}%`;
            params.push(term, term, term, term, term);
        }

        query += ` ORDER BY u.creado_en DESC`;
        const [clientes] = await db.query(query, params);

        return res.json({ clientes });
    } catch (error) {
        console.error('Error en getClientes:', error);
        return res.status(500).json({ error: 'Error al listar clientes.' });
    }
}

// 3. Crear cliente con su cuenta inicial
async function crearCliente(req, res) {
    const connection = await db.getConnection();
    try {
        const {
            tipo_documento_id,
            numero_documento,
            nombres,
            apellidos,
            correo,
            telefono,
            password,
            tipo_cuenta_id,
            pin_cajero,
            saldo_inicial
        } = req.body;

        if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
            return res.status(400).json({ error: 'Todos los campos obligatorios deben ser diligenciados.' });
        }

        if (pin_cajero.toString().length !== 4) {
            return res.status(400).json({ error: 'El PIN del cajero debe ser exactamente de 4 dígitos numéricos.' });
        }

        const saldoNum = parseFloat(saldo_inicial) || 0;
        if (saldoNum < 0) {
            return res.status(400).json({ error: 'El saldo inicial no puede ser negativo.' });
        }

        await connection.beginTransaction();

        // Validar unicidad de correo y documento
        const [existentes] = await connection.query(`
            SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)
        `, [correo.trim(), tipo_documento_id || 1, numero_documento.trim()]);

        if (existentes.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Ya existe un usuario registrado con ese correo o número de documento.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(pin_cajero.toString().trim(), 10);

        // 1. Insertar usuario
        const [resUser] = await connection.query(`
            INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, password_hash, rol_id, estado_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)
        `, [tipo_documento_id || 1, numero_documento.trim(), nombres.trim(), apellidos.trim(), correo.trim(), telefono ? telefono.trim() : null, passwordHash]);

        const nuevoUsuarioId = resUser.insertId;

        // 2. Generar número de cuenta aleatorio bancario (ej: 4001 + 8 dígitos)
        const prefix = (tipo_cuenta_id == 2) ? '5001' : '4001';
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        const numeroCuenta = `${prefix}${randomDigits}`;

        // 3. Insertar cuenta
        const [resCuenta] = await connection.query(`
            INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_id, estado_id, pin_hash, saldo)
            VALUES (?, ?, ?, 1, ?, ?)
        `, [nuevoUsuarioId, numeroCuenta, tipo_cuenta_id || 1, pinHash, saldoNum]);

        const nuevaCuentaId = resCuenta.insertId;

        // 4. Si hay saldo inicial > 0, registrar operación y movimiento
        if (saldoNum > 0) {
            const adminId = req.session.usuario ? req.session.usuario.id : null;
            const [resOp] = await connection.query(`
                INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
                VALUES (1, 1, 3, ?, ?, 'Depósito de apertura de cuenta en ventanilla')
            `, [adminId, saldoNum]);

            await connection.query(`
                INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
                VALUES (?, ?, 'CREDITO', ?)
            `, [resOp.insertId, nuevaCuentaId, saldoNum]);
        }

        await connection.commit();

        return res.json({
            exito: true,
            mensaje: 'Cliente y cuenta bancaria creados exitosamente.',
            cliente: {
                id: nuevoUsuarioId,
                nombres,
                apellidos,
                correo,
                numero_cuenta: numeroCuenta,
                saldo_inicial: saldoNum
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en crearCliente:', error);
        return res.status(500).json({ error: 'Error al registrar nuevo cliente en el banco.' });
    } finally {
        connection.release();
    }
}

// 4. Habilitar o bloquear cliente y sus cuentas (1: ACTIVO, 2: INACTIVO, 3: BLOQUEADO)
async function cambiarEstadoCliente(req, res) {
    const connection = await db.getConnection();
    try {
        const { usuario_id, nuevo_estado_id } = req.body;

        if (!usuario_id || !nuevo_estado_id) {
            return res.status(400).json({ error: 'Datos incompletos.' });
        }

        await connection.beginTransaction();

        // Actualizar usuario
        await connection.query('UPDATE usuarios SET estado_id = ? WHERE id = ? AND rol_id = 2', [nuevo_estado_id, usuario_id]);

        // Sincronizar estado de las cuentas del cliente
        // Si el cliente es bloqueado (3), sus cuentas pasan a bloqueadas (3)
        // Si el cliente es activado (1), sus cuentas pasan a activas (1)
        const estadoCuenta = (nuevo_estado_id == 3) ? 3 : (nuevo_estado_id == 1 ? 1 : 2);
        await connection.query('UPDATE cuentas SET estado_id = ? WHERE usuario_id = ?', [estadoCuenta, usuario_id]);

        await connection.commit();

        return res.json({ mensaje: 'Estado del cliente y sus cuentas actualizado correctamente.' });
    } catch (error) {
        await connection.rollback();
        console.error('Error en cambiarEstadoCliente:', error);
        return res.status(500).json({ error: 'Error al cambiar estado del cliente.' });
    } finally {
        connection.release();
    }
}

// 5. Realizar consignación en ventanilla administrativa
async function consignar(req, res) {
    const connection = await db.getConnection();
    try {
        const adminId = req.session.usuario.id;
        let { numero_cuenta, valor, concepto } = req.body;

        valor = parseFloat(valor);
        if (!valor || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor de la consignación debe ser mayor a cero ($0).' });
        }

        if (!numero_cuenta) {
            return res.status(400).json({ error: 'Debe ingresar el número de cuenta de destino.' });
        }

        numero_cuenta = numero_cuenta.trim().replace(/[-\s]/g, '');

        await connection.beginTransaction();

        // 1. Buscar y bloquear cuenta para actualización
        const [cuentas] = await connection.query(`
            SELECT c.*, ec.nombre AS estado_nombre, u.nombres, u.apellidos
            FROM cuentas c
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.numero_cuenta = ?
            FOR UPDATE
        `, [numero_cuenta]);

        if (cuentas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'La cuenta bancaria no existe.' });
        }

        const cuenta = cuentas[0];
        if (cuenta.estado_nombre !== 'ACTIVA') {
            await connection.rollback();
            return res.status(403).json({ error: `La cuenta se encuentra ${cuenta.estado_nombre}. No se permiten consignaciones.` });
        }

        const saldoActual = parseFloat(cuenta.saldo);
        const nuevoSaldo = saldoActual + valor;

        // 2. Actualizar saldo
        await connection.query('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldo, cuenta.id]);

        // 3. Registrar operación
        const descripOp = concepto && concepto.trim() ? concepto.trim() : `Consignación en ventanilla administrativa por $${valor.toLocaleString('es-CO')}`;
        const [resOp] = await connection.query(`
            INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
            VALUES (1, 1, 3, ?, ?, ?)
        `, [adminId, valor, descripOp]);

        const operacionId = resOp.insertId;

        // 4. Registrar movimiento contable
        await connection.query(`
            INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
            VALUES (?, ?, 'CREDITO', ?)
        `, [operacionId, cuenta.id, nuevoSaldo]);

        await connection.commit();

        return res.json({
            exito: true,
            mensaje: 'Consignación aplicada exitosamente.',
            recibo: {
                transaccion_id: operacionId,
                fecha: new Date(),
                numero_cuenta: cuenta.numero_cuenta,
                titular: `${cuenta.nombres} ${cuenta.apellidos}`,
                valor_consignado: valor,
                nuevo_saldo: nuevoSaldo
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en consignar:', error);
        return res.status(500).json({ error: 'Error al procesar la consignación.' });
    } finally {
        connection.release();
    }
}

// 6. Historial general de movimientos bancarios (Auditoría)
async function getHistorialGeneral(req, res) {
    try {
        const [movimientos] = await db.query(`
            SELECT m.id, m.sentido, m.sentido AS tipo_movimiento, o.valor, m.saldo_resultante, m.creada_en AS fecha_hora,
                   c.numero_cuenta, u.nombres, u.apellidos,
                   o.descripcion, top.nombre AS tipo_operacion, can.nombre AS canal
            FROM movimientos m
            JOIN cuentas c ON m.cuenta_id = c.id
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN operaciones o ON m.operacion_id = o.id
            JOIN tipos_operacion top ON o.tipo_id = top.id
            JOIN canales can ON o.canal_id = can.id
            ORDER BY m.creada_en DESC, m.id DESC
            LIMIT 50
        `);

        return res.json({ movimientos });
    } catch (error) {
        console.error('Error en getHistorialGeneral:', error);
        return res.status(500).json({ error: 'Error al consultar historial general.' });
    }
}

module.exports = {
    getDashboard,
    getClientes,
    crearCliente,
    cambiarEstadoCliente,
    consignar,
    getHistorialGeneral
};
