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

        req.session.usuario = {
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

        return res.json({
            mensaje: 'Inicio de sesión exitoso.',
            usuario: req.session.usuario,
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

        req.session.usuario = {
            id: admin.id,
            nombres: admin.nombres,
            apellidos: admin.apellidos,
            correo: admin.correo,
            rol_id: admin.rol_id,
            rol_nombre: admin.rol_nombre
        };

        return res.json({
            mensaje: 'Bienvenido al panel de administración bancaria.',
            admin: req.session.usuario
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

        req.session.cajeroCuenta = {
            id: cuenta.id,
            usuario_id: cuenta.usuario_id,
            titular: `${cuenta.nombres} ${cuenta.apellidos}`,
            numero_cuenta: cuenta.numero_cuenta,
            tipo_cuenta: cuenta.tipo_cuenta,
            saldo: parseFloat(cuenta.saldo)
        };

        return res.json({
            mensaje: 'Identificación correcta en cajero automático.',
            cuenta: req.session.cajeroCuenta
        });
    } catch (error) {
        console.error('Error en loginCajero:', error);
        return res.status(500).json({ error: 'Error en la terminal del cajero automático.' });
    }
}

// 4. Cerrar sesión
function logout(req, res) {
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
        usuario: req.session.usuario || null,
        cajero: req.session.cajeroCuenta || null
    });
}

module.exports = {
    loginCliente,
    loginAdmin,
    loginCajero,
    logout,
    checkSession
};
