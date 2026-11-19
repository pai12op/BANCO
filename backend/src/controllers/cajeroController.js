// src/controllers/cajeroController.js
// Controlador HTTP delgado para Terminal de Cajero Automático (ATM)
const cajeroService = require('../services/cajeroService');
const { handleControllerError } = require('../utils/AppError');
const { getCajeroSession } = require('../utils/sessionHelper');

async function getSaldo(req, res) {
    try {
        const cajero = getCajeroSession(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });

        const infoCuenta = await cajeroService.consultarSaldoAtm(cajero);
        cajero.saldo = infoCuenta.saldo;

        return res.json({
            cuenta: infoCuenta,
            ...infoCuenta,
        });
    } catch (error) {
        return handleControllerError(res, error, 'cajeroController.getSaldo', 'Error en terminal de cajero.');
    }
}

async function retirar(req, res) {
    try {
        const cajero = getCajeroSession(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });

        const recibo = await cajeroService.ejecutarRetiroAtm({
            cuentaId: cajero.id,
            ...(req.body || {}),
        });
        cajero.saldo = recibo.nuevo_saldo;

        return res.json({
            exito: true,
            mensaje: '¡Retiro exitoso! Por favor tome su dinero y su comprobante.',
            recibo,
        });
    } catch (error) {
        return handleControllerError(res, error, 'cajeroController.retirar', 'Error de comunicación con el dispensador de efectivo.');
    }
}

async function getUltimosMovimientos(req, res) {
    try {
        const cajero = getCajeroSession(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });

        const movimientos = await cajeroService.consultarUltimosMovimientosAtm(cajero.id);
        return res.json({ movimientos });
    } catch (error) {
        return handleControllerError(res, error, 'cajeroController.getUltimosMovimientos', 'Error al consultar movimientos en cajero.');
    }
}

module.exports = {
    getSaldo,
    retirar,
    getUltimosMovimientos,
};
