// src/controllers/usuarioController.js
// Controlador HTTP delgado para Banca Virtual de clientes
const bancaService = require('../services/bancaService');
const { handleControllerError } = require('../utils/AppError');
const { getClienteSession, rotateSessionPreservingModules } = require('../utils/sessionHelper');

async function getResumen(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const data = await bancaService.obtenerResumen(cliente.id);
        return res.json(data);
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.getResumen', 'Error al consultar resumen financiero.');
    }
}

async function getMovimientos(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const cuentaId = req.query.cuenta_id || cliente.cuenta_principal_id;
        const data = await bancaService.obtenerMovimientos(cuentaId, cliente.id);
        return res.json(data);
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.getMovimientos', 'Error al consultar historial de movimientos.');
    }
}

async function transferir(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        const comprobante = await bancaService.ejecutarTransferencia({
            usuarioId: cliente.id,
            ...(req.body || {}),
        });

        return res.json({
            exito: true,
            mensaje: 'Transferencia exitosa.',
            comprobante,
        });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.transferir', 'Ocurrió un error al procesar la transferencia.');
    }
}

async function actualizarPerfil(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        const limpio = await bancaService.actualizarPerfilTelefono(cliente.id, req.body?.telefono);
        if (req.session.cliente) req.session.cliente.telefono = limpio;
        if (req.session.usuario) req.session.usuario.telefono = limpio;

        return res.json({ exito: true, mensaje: 'Información de perfil actualizada con éxito.' });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.actualizarPerfil', 'Error al actualizar perfil.');
    }
}

async function cambiarPassword(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        await bancaService.cambiarPasswordAutenticado({
            usuarioId: cliente.id,
            ...(req.body || {}),
        });
        await rotateSessionPreservingModules(req);

        return res.json({
            exito: true,
            mensaje: '¡Contraseña actualizada con éxito! Autenticación reforzada verificada y sesión asegurada.',
        });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.cambiarPassword', 'Error al cambiar contraseña.');
    }
}

async function pagoTarjeta(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        const comprobante = await bancaService.pagarConTarjetaPos({
            usuarioId: cliente.id,
            ...(req.body || {}),
        });

        return res.json({
            exito: true,
            mensaje: '¡Pago en datáfono aprobado con éxito!',
            comprobante,
        });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.pagoTarjeta', 'Error al procesar el pago con la tarjeta.');
    }
}

async function ajustarPlataTarjeta(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        const { valor, nuevoSaldo } = await bancaService.retirarSaldoTarjeta({
            usuarioId: cliente.id,
            ...(req.body || {}),
        });

        return res.json({
            exito: true,
            mensaje: `Se retiraron $${valor.toLocaleString('es-CO')} COP de la tarjeta con éxito.`,
            nuevo_saldo: nuevoSaldo,
        });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.ajustarPlataTarjeta', 'Error al actualizar el saldo de la tarjeta.');
    }
}

async function solicitarCodigoRetiro(req, res) {
    try {
        const cliente = getClienteSession(req);
        if (!cliente) {
            return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión en la Banca Virtual.' });
        }

        const result = await bancaService.solicitarOtpRetiro({
            usuarioId: cliente.id,
            ...(req.body || {}),
        });

        return res.json({
            exito: true,
            mensaje: 'Código de retiro para cajero ATM generado con éxito.',
            codigo: result.codigo,
            expira_minutos: result.expiraMinutos,
            numero_cuenta: result.numero_cuenta,
            saldo: result.saldo,
        });
    } catch (error) {
        return handleControllerError(res, error, 'usuarioController.solicitarCodigoRetiro', 'Error al generar código de retiro.');
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
    solicitarCodigoRetiro,
};
