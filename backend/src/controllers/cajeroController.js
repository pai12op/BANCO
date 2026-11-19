// src/controllers/cajeroController.js
const bcrypt = require('bcryptjs');
const bankRepository = require('../repositories/bankRepository');
const { validarCodigoRetiro } = require('../config/otpStore');

function getCajero(req) {
    return req.session.cajero || req.session.cajeroCuenta;
}

// 1. Consultar saldo en pantalla del cajero
async function getSaldo(req, res) {
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });

        const cuenta = await bankRepository.getSaldoCajero(cajero.id);
        if (!cuenta) {
            return res.status(404).json({ error: 'Cuenta no encontrada.' });
        }

        const saldoActual = parseFloat(cuenta.saldo);
        cajero.saldo = saldoActual;

        const infoCuenta = {
            id: cajero.id,
            titular: cajero.titular,
            numero_cuenta: cuenta.numero_cuenta,
            tipo_cuenta: cuenta.tipo_cuenta,
            saldo: saldoActual,
        };

        return res.json({
            cuenta: infoCuenta,
            ...infoCuenta,
        });
    } catch (error) {
        console.error('Error en getSaldo cajero:', error.message);
        return res.status(500).json({ error: 'Error en terminal de cajero.' });
    }
}

// 2. Realizar retiro desde cajero automático
async function retirar(req, res) {
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });

        let { valor, codigoOtp } = req.body;
        valor = parseFloat(valor);
        if (!valor || Number.isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor a retirar debe ser mayor a cero ($0).' });
        }
        if (valor % 10000 !== 0) {
            return res.status(400).json({ error: 'El valor debe ser múltiplo de $10.000 COP.' });
        }
        if (!codigoOtp) {
            return res.status(400).json({ error: 'Debe ingresar el código de retiro OTP de 6 dígitos o PIN de 4 dígitos.' });
        }

        const recibo = await bankRepository.retirarPorCajero({
            cuentaId: cajero.id,
            valor,
            cleanOtp: codigoOtp.toString().trim(),
            validarCodigoRetiro,
            bcrypt,
            labelBanco: 'Banca Rota',
        });

        cajero.saldo = recibo.nuevo_saldo;

        return res.json({
            exito: true,
            mensaje: '¡Retiro exitoso! Por favor tome su dinero y su comprobante.',
            recibo,
        });
    } catch (error) {
        console.error('Error en retirar cajero:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error de comunicación con el dispensador de efectivo.',
        });
    }
}

// 3. Consultar últimos movimientos en pantalla de cajero
async function getUltimosMovimientos(req, res) {
    try {
        const cajero = getCajero(req);
        if (!cajero) return res.status(401).json({ error: 'Sesión no activa' });
        const movimientos = await bankRepository.getUltimosMovimientosCajero(cajero.id);
        return res.json({ movimientos });
    } catch (error) {
        console.error('Error en getUltimosMovimientos cajero:', error.message);
        return res.status(500).json({ error: 'Error al consultar movimientos en cajero.' });
    }
}

module.exports = {
    getSaldo,
    retirar,
    getUltimosMovimientos,
};
