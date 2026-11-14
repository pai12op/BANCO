// src/controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Iniciar sesión en Banca Virtual (Cliente)
async function loginCliente(req, res) {
    try {
        const { identificador, password } = req.body; // Correo o número de documento
        if (!identificador || !password) {
            return res.status(400).json({ error: 'Debe ingresar su correo o documento y contraseña.' });
        }

        const [usuarios] = await db.query(`
            SELECT u.*, r.nombre AS rol_nombre, e.nombre AS estado_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            JOIN estados_usuario e ON u.estado_id = e.id
            WHERE u.correo = ? OR u.numero_documento = ?
        `, [identificador.trim(), identificador.trim()]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const usuario = usuarios[0];

        if (usuario.rol_id !== 2) {
            return res.status(403).json({ error: 'Este usuario no tiene acceso a la Banca Virtual de clientes.' });
        }

        if (usuario.estado_nombre !== 'ACTIVO') {
            return res.status(403).json({ error: `Su usuario se encuentra en estado ${usuario.estado_nombre}. Contacte al administrador del banco.` });
        }

        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Obtener cuentas asociadas al cliente
        const [cuentas] = await db.query(`
            SELECT c.*, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta
            FROM cuentas c
            JOIN tipos_cuenta tc ON c.tipo_id = tc.id
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            WHERE c.usuario_id = ?
        `, [usuario.id]);

        req.session.cliente = {
            id: usuario.id,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            numero_documento: usuario.numero_documento,
            telefono: usuario.telefono,
            rol_id: usuario.rol_id,
            rol_nombre: usuario.rol_nombre,
            cuenta_principal_id: cuentas.length > 0 ? cuentas[0].id : null,
            numero_cuenta: cuentas.length > 0 ? cuentas[0].numero_cuenta : null
        };
        req.session.usuario = req.session.cliente;

        return res.json({
            mensaje: 'Inicio de sesión exitoso.',
            usuario: req.session.cliente,
            cuentas
        });
    } catch (error) {
        console.error('Error en loginCliente:', error);
        return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
}

// 2. Iniciar sesión en Panel Administrativo
async function loginAdmin(req, res) {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) {
            return res.status(400).json({ error: 'Ingrese correo y contraseña de administrador.' });
        }

        const [usuarios] = await db.query(`
            SELECT u.*, r.nombre AS rol_nombre, e.nombre AS estado_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            JOIN estados_usuario e ON u.estado_id = e.id
            WHERE u.correo = ? AND u.rol_id = 1
        `, [correo.trim()]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales administrativas inválidas.' });
        }

        const admin = usuarios[0];
        if (admin.estado_nombre !== 'ACTIVO') {
            return res.status(403).json({ error: 'El usuario administrativo se encuentra inactivo o bloqueado.' });
        }

        const passwordValido = await bcrypt.compare(password, admin.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales administrativas inválidas.' });
        }

        req.session.admin = {
            id: admin.id,
            nombres: admin.nombres,
            apellidos: admin.apellidos,
            correo: admin.correo,
            rol_id: admin.rol_id,
            rol_nombre: admin.rol_nombre
        };

        return res.json({
            mensaje: 'Bienvenido al panel de administración bancaria.',
            admin: req.session.admin
        });
    } catch (error) {
        console.error('Error en loginAdmin:', error);
        return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
}

// 3. Identificación en Cajero Automático (Cuenta + PIN)
async function loginCajero(req, res) {
    try {
        const { numero_cuenta, pin } = req.body;
        if (!numero_cuenta || !pin) {
            return res.status(400).json({ error: 'Ingrese el número de cuenta y su PIN de 4 dígitos.' });
        }

        const [cuentas] = await db.query(`
            SELECT c.*, tc.nombre AS tipo_cuenta, ec.nombre AS estado_cuenta,
                   u.nombres, u.apellidos, u.numero_documento, u.estado_id AS usuario_estado_id
            FROM cuentas c
            JOIN tipos_cuenta tc ON c.tipo_id = tc.id
            JOIN estados_cuenta ec ON c.estado_id = ec.id
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.numero_cuenta = ?
        `, [numero_cuenta.trim().replace(/[-\s]/g, '')]);

        if (cuentas.length === 0) {
            return res.status(404).json({ error: 'La cuenta ingresada no existe en el sistema.' });
        }

        const cuenta = cuentas[0];

        if (cuenta.estado_cuenta !== 'ACTIVA' || cuenta.usuario_estado_id === 3) {
            return res.status(403).json({ error: 'La cuenta se encuentra BLOQUEADA o INACTIVA. Operación rechazada.' });
        }

        const pinValido = await bcrypt.compare(pin.toString().trim(), cuenta.pin_hash);
        if (!pinValido) {
            return res.status(401).json({ error: 'PIN de seguridad incorrecto.' });
        }

        req.session.cajero = {
            id: cuenta.id,
            usuario_id: cuenta.usuario_id,
            titular: `${cuenta.nombres} ${cuenta.apellidos}`,
            numero_cuenta: cuenta.numero_cuenta,
            tipo_cuenta: cuenta.tipo_cuenta,
            saldo: parseFloat(cuenta.saldo)
        };
        req.session.cajeroCuenta = req.session.cajero;

        return res.json({
            mensaje: 'Identificación correcta en cajero automático.',
            cuenta: req.session.cajero
        });
    } catch (error) {
        console.error('Error en loginCajero:', error);
        return res.status(500).json({ error: 'Error en la terminal del cajero automático.' });
    }
}

// 4. Cerrar sesión aislada por módulo (evita cerrar las otras pestañas)
function logout(req, res) {
    const modulo = req.body?.modulo || req.query?.modulo;
    if (modulo === 'cliente') {
        delete req.session.cliente;
        return res.json({ mensaje: 'Sesión de Banca Virtual cerrada.' });
    }
    if (modulo === 'admin') {
        delete req.session.admin;
        return res.json({ mensaje: 'Sesión administrativa cerrada.' });
    }
    if (modulo === 'cajero') {
        delete req.session.cajero;
        delete req.session.cajeroCuenta;
        return res.json({ mensaje: 'Tarjeta expulsada de la terminal.' });
    }
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
        }
        res.clearCookie('connect.sid');
        return res.json({ mensaje: 'Sesión finalizada correctamente.' });
    });
}

// 5. Consultar estado de sesión actual
function checkSession(req, res) {
    return res.json({
        cliente: req.session.cliente || null,
        admin: req.session.admin || null,
        cajero: req.session.cajero || req.session.cajeroCuenta || null
    });
}

// 6. Registro / Apertura de Cuenta Pública (Cliente desde el panel principal con todos sus datos)
async function registroCliente(req, res) {
    const connection = await db.getConnection();
    try {
        const {
            tipo_documento_id,
            numero_documento,
            nombres,
            apellidos,
            correo,
            telefono,
            tipo_cuenta_id,
            saldo_inicial,
            password,
            pin_cajero
        } = req.body;

        if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
            return res.status(400).json({ error: 'Por favor diligencie todos los campos obligatorios del registro.' });
        }

        const pinStr = pin_cajero.toString().trim();
        if (pinStr.length !== 4 || !/^\d{4}$/.test(pinStr)) {
            return res.status(400).json({ error: 'El PIN de seguridad del cajero debe ser de exactamente 4 dígitos numéricos.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe contener al menos 6 caracteres.' });
        }

        const saldoNum = parseFloat(saldo_inicial) || 0;
        if (saldoNum < 0) {
            return res.status(400).json({ error: 'El saldo inicial no puede ser negativo.' });
        }

        await connection.beginTransaction();

        // Validar unicidad
        const [existentes] = await connection.query(`
            SELECT id FROM usuarios WHERE correo = ? OR (tipo_documento_id = ? AND numero_documento = ?)
        `, [correo.trim(), tipo_documento_id || 1, numero_documento.trim()]);

        if (existentes.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo o número de documento.' });
        }

        // Hashing seguro de contraseña y PIN con bcrypt (10 salt rounds)
        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(pinStr, 10);

        // 1. Insertar usuario cliente (rol_id = 2, estado_id = 1 ACTIVO)
        const [resUser] = await connection.query(`
            INSERT INTO usuarios (tipo_documento_id, numero_documento, nombres, apellidos, correo, telefono, password_hash, rol_id, estado_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 2, 1)
        `, [tipo_documento_id || 1, numero_documento.trim(), nombres.trim(), apellidos.trim(), correo.trim(), telefono ? telefono.trim() : null, passwordHash]);

        const nuevoUsuarioId = resUser.insertId;

        // 2. Generar número de cuenta bancaria
        const prefix = (tipo_cuenta_id == 2) ? '5001' : '4001';
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        const numeroCuenta = `${prefix}${randomDigits}`;

        // 3. Crear cuenta bancaria activa (estado_id = 1)
        const [resCuenta] = await connection.query(`
            INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_id, estado_id, pin_hash, saldo)
            VALUES (?, ?, ?, 1, ?, ?)
        `, [nuevoUsuarioId, numeroCuenta, tipo_cuenta_id || 1, pinHash, saldoNum]);

        const nuevaCuentaId = resCuenta.insertId;

        // 4. Si hay saldo inicial, registrar operación contable de apertura (Canal 2: Banca Virtual)
        if (saldoNum > 0) {
            const [resOp] = await connection.query(`
                INSERT INTO operaciones (tipo_id, estado_id, canal_id, realizado_por, valor, descripcion)
                VALUES (1, 1, 2, ?, ?, 'Apertura de cuenta con depósito inicial en línea')
            `, [nuevoUsuarioId, saldoNum]);

            await connection.query(`
                INSERT INTO movimientos (operacion_id, cuenta_id, sentido, saldo_resultante)
                VALUES (?, ?, 'CREDITO', ?)
            `, [resOp.insertId, nuevaCuentaId, saldoNum]);
        }

        await connection.commit();

        return res.json({
            exito: true,
            mensaje: '¡Tu cuenta bancaria ha sido creada exitosamente! Ya puedes iniciar sesión con tu correo y clave.',
            cuenta: {
                numero_cuenta: numeroCuenta,
                titular: `${nombres} ${apellidos}`,
                correo: correo.trim(),
                saldo: saldoNum
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en registroCliente:', error);
        return res.status(500).json({ error: 'Error al procesar la apertura de la cuenta.' });
    } finally {
        connection.release();
    }
}

module.exports = {
    loginCliente,
    loginAdmin,
    loginCajero,
    logout,
    checkSession,
    registroCliente
};
