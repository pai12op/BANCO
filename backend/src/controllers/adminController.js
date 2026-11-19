// src/controllers/adminController.js
const bcrypt = require('bcryptjs');
const bankRepository = require('../repositories/bankRepository');

const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// 1. Dashboard administrativo
async function getDashboard(req, res) {
    try {
        const data = await bankRepository.getDashboardAdmin();
        return res.json(data);
    } catch (error) {
        console.error('Error en getDashboard:', error.message);
        return res.status(500).json({ error: 'Error al cargar métricas del dashboard.' });
    }
}

// 2. Listar y buscar clientes
async function getClientes(req, res) {
    try {
        const { busqueda } = req.query;
        const clientes = await bankRepository.getClientesAdmin(busqueda);
        return res.json({ clientes });
    } catch (error) {
        console.error('Error en getClientes:', error.message);
        return res.status(500).json({ error: 'Error al listar clientes.' });
    }
}

// 3. Crear cliente desde ventanilla administrativa
async function crearCliente(req, res) {
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
            saldo_inicial,
        } = req.body;

        if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
            return res.status(400).json({
                error: 'Todos los campos obligatorios, incluyendo contraseña y PIN de 4 dígitos, deben ser diligenciados.',
            });
        }

        const finalPin = pin_cajero.toString().trim();
        if (!/^\d{4}$/.test(finalPin)) {
            return res.status(400).json({ error: 'El PIN del cajero debe ser exactamente de 4 dígitos numéricos.' });
        }

        if (!STRONG_PASS_REGEX.test(password)) {
            return res.status(400).json({
                error: 'La contraseña del cliente debe tener mínimo 8 caracteres, mayúscula, minúscula y número.',
            });
        }

        const saldoNum = parseFloat(saldo_inicial) || 0;
        if (saldoNum < 0) {
            return res.status(400).json({ error: 'El saldo inicial no puede ser negativo.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(finalPin, 10);
        const adminId = req.session.admin?.id || req.session.usuario?.id || null;

        const cliente = await bankRepository.crearClienteAdmin({
            tipo_documento_id,
            numero_documento: numero_documento.toString().trim(),
            nombres: nombres.toString().trim(),
            apellidos: apellidos.toString().trim(),
            correo: correo.toString().trim(),
            telefono: telefono ? telefono.toString().trim() : null,
            passwordHash,
            pinHash,
            tipo_cuenta_id,
            saldoNum,
            adminId,
            esBancoCorazones: false,
        });

        return res.json({
            exito: true,
            mensaje: 'Cliente y cuenta bancaria creados con éxito.',
            cliente,
        });
    } catch (error) {
        console.error('Error en crearCliente:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error al registrar nuevo cliente en el banco.',
        });
    }
}

// 4. Habilitar o bloquear cliente y sus cuentas
async function cambiarEstadoCliente(req, res) {
    try {
        const { usuario_id, nuevo_estado_id } = req.body;
        if (!usuario_id || !nuevo_estado_id) {
            return res.status(400).json({ error: 'Datos incompletos.' });
        }
        await bankRepository.actualizarEstadoClienteAdmin(usuario_id, nuevo_estado_id);
        return res.json({ exito: true, mensaje: 'Estado del cliente y sus cuentas actualizado con éxito.' });
    } catch (error) {
        console.error('Error en cambiarEstadoCliente:', error.message);
        return res.status(500).json({ error: 'Error al cambiar estado del cliente.' });
    }
}

// 5. Realizar consignación en ventanilla administrativa
async function consignar(req, res) {
    try {
        const adminId = req.session.admin?.id || req.session.usuario?.id;
        let { numero_cuenta, valor, concepto } = req.body;

        valor = parseFloat(valor);
        if (!valor || Number.isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor de la consignación debe ser mayor a cero ($0).' });
        }

        if (!numero_cuenta) {
            return res.status(400).json({ error: 'Debe ingresar el número de cuenta de destino.' });
        }

        numero_cuenta = numero_cuenta.toString().trim().replace(/[-\s]/g, '');

        const recibo = await bankRepository.consignarEnCuentaAdmin({
            adminId,
            numero_cuenta,
            valor,
            concepto,
        });

        return res.json({
            exito: true,
            mensaje: '¡Consignación exitosa!',
            recibo,
        });
    } catch (error) {
        console.error('Error en consignar:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error al procesar la consignación.',
        });
    }
}

// 6. Historial general de movimientos bancarios
async function getHistorialGeneral(req, res) {
    try {
        const movimientos = await bankRepository.getHistorialGeneralAdmin();
        return res.json({ movimientos });
    } catch (error) {
        console.error('Error en getHistorialGeneral:', error.message);
        return res.status(500).json({ error: 'Error al consultar historial general.' });
    }
}

module.exports = {
    getDashboard,
    getClientes,
    crearCliente,
    cambiarEstadoCliente,
    consignar,
    getHistorialGeneral,
};
