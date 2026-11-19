// src/controllers/adminController.js
// Controlador HTTP delgado para Consola Administrativa y Ventanilla
const adminService = require('../services/adminService');
const { handleControllerError } = require('../utils/AppError');
const { getAdminSession } = require('../utils/sessionHelper');

async function getDashboard(_req, res) {
    try {
        const data = await adminService.obtenerDashboard();
        return res.json(data);
    } catch (error) {
        return handleControllerError(res, error, 'adminController.getDashboard', 'Error al cargar métricas del dashboard.');
    }
}

async function getClientes(req, res) {
    try {
        const clientes = await adminService.listarClientes(req.query.busqueda);
        return res.json({ clientes });
    } catch (error) {
        return handleControllerError(res, error, 'adminController.getClientes', 'Error al listar clientes.');
    }
}

async function crearCliente(req, res) {
    try {
        const adminId = getAdminSession(req)?.id || null;
        const cliente = await adminService.registrarClienteAdmin(adminId, req.body || {});
        return res.json({
            exito: true,
            mensaje: 'Cliente y cuenta bancaria creados con éxito.',
            cliente,
        });
    } catch (error) {
        return handleControllerError(res, error, 'adminController.crearCliente', 'Error al registrar nuevo cliente en el banco.');
    }
}

async function cambiarEstadoCliente(req, res) {
    try {
        await adminService.cambiarEstadoCliente(req.body || {});
        return res.json({ exito: true, mensaje: 'Estado del cliente y sus cuentas actualizado con éxito.' });
    } catch (error) {
        return handleControllerError(res, error, 'adminController.cambiarEstadoCliente', 'Error al cambiar estado del cliente.');
    }
}

async function consignar(req, res) {
    try {
        const adminId = getAdminSession(req)?.id || null;
        const recibo = await adminService.consignarVentanilla(adminId, req.body || {});
        return res.json({
            exito: true,
            mensaje: '¡Consignación exitosa!',
            recibo,
        });
    } catch (error) {
        return handleControllerError(res, error, 'adminController.consignar', 'Error al procesar la consignación.');
    }
}

async function getHistorialGeneral(_req, res) {
    try {
        const movimientos = await adminService.obtenerAuditoriaGeneral();
        return res.json({ movimientos });
    } catch (error) {
        return handleControllerError(res, error, 'adminController.getHistorialGeneral', 'Error al consultar historial general.');
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
