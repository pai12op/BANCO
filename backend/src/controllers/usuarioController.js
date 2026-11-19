// src/controllers/usuarioController.js
const bcrypt = require('bcryptjs');
const bankRepository = require('../repositories/bankRepository');
const { generarCodigoRetiro } = require('../config/otpStore');

const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function getCliente(req) {
    return req.session.cliente || req.session.usuario;
}

// 1. Resumen de cuentas del cliente autenticado
async function getResumen(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const data = await bankRepository.getResumenUsuario(cliente.id);
        return res.json(data);
    } catch (error) {
        console.error('Error en getResumen:', error.message);
        return res.status(500).json({ error: 'Error al consultar resumen financiero.' });
    }
}

// 2. Historial de movimientos de una cuenta del usuario autenticado
async function getMovimientos(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const cuentaId = req.query.cuenta_id || cliente.cuenta_principal_id;

        const data = await bankRepository.getMovimientosCuenta(cuentaId, cliente.id);
        if (!data) {
            return res.status(403).json({ error: 'Acceso denegado a la cuenta solicitada.' });
        }
        return res.json(data);
    } catch (error) {
        console.error('Error en getMovimientos:', error.message);
        return res.status(500).json({ error: 'Error al consultar historial de movimientos.' });
    }
}

// 3. Realizar transferencia entre cuentas
async function transferir(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        let { cuenta_origen_id, numero_cuenta_destino, valor, concepto, descripcion } = req.body;
        valor = parseFloat(valor);
        if (!valor || Number.isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor de la transferencia debe ser mayor a cero ($0).' });
        }

        if (!numero_cuenta_destino) {
            return res.status(400).json({ error: 'Debe ingresar el número de cuenta de destino.' });
        }

        numero_cuenta_destino = String(numero_cuenta_destino).trim().replace(/\D/g, '');
        if (!numero_cuenta_destino) {
            return res.status(400).json({ error: 'El número de cuenta de destino no es válido.' });
        }

        const comprobante = await bankRepository.transferirEntreCuentas({
            usuarioId: cliente.id,
            cuenta_origen_id,
            numero_cuenta_destino,
            valor,
            concepto: concepto || descripcion,
        });

        return res.json({
            exito: true,
            mensaje: 'Transferencia exitosa.',
            comprobante,
        });
    } catch (error) {
        console.error('Error en transferir:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Ocurrió un error al procesar la transferencia.',
        });
    }
}

// 4. Modificar perfil (teléfono)
async function actualizarPerfil(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });
        const { telefono } = req.body;
        const limpio = telefono ? telefono.toString().trim() : null;

        await bankRepository.actualizarTelefonoUsuario(cliente.id, limpio);
        if (req.session.cliente) req.session.cliente.telefono = limpio;
        if (req.session.usuario) req.session.usuario.telefono = limpio;

        return res.json({ exito: true, mensaje: 'Información de perfil actualizada con éxito.' });
    } catch (error) {
        console.error('Error en actualizarPerfil:', error.message);
        return res.status(500).json({ error: 'Error al actualizar perfil.' });
    }
}

// 5. Cambio de contraseña autenticado (Contraseña actual + PIN 4 dígitos + rotación de sesión)
async function cambiarPassword(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        const { password_actual, password_nuevo, password_confirmacion, pin_cajero } = req.body;

        if (!password_actual || !password_nuevo || !pin_cajero) {
            return res.status(400).json({
                error: 'Debe ingresar contraseña actual, PIN de seguridad de 4 dígitos y la nueva contraseña.',
            });
        }

        if (password_confirmacion !== undefined && password_nuevo !== password_confirmacion) {
            return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
        }

        const pinStr = pin_cajero.toString().trim();
        if (!/^\d{4}$/.test(pinStr)) {
            return res.status(400).json({ error: 'El PIN de seguridad debe tener exactamente 4 dígitos numéricos.' });
        }

        if (!STRONG_PASS_REGEX.test(password_nuevo)) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.',
            });
        }

        const { usuario, cuentas } = await bankRepository.findCredencialesCambioPassword(cliente.id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const passwordValido = await bcrypt.compare(password_actual, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Autenticación fallida: la contraseña actual no es correcta.' });
        }

        if (!cuentas || cuentas.length === 0) {
            return res.status(403).json({ error: 'No cuentas con una cuenta activa para validar el PIN de seguridad.' });
        }

        let pinValido = false;
        for (const c of cuentas) {
            if (await bcrypt.compare(pinStr, c.pin_hash)) {
                pinValido = true;
                break;
            }
        }
        if (!pinValido) {
            return res.status(401).json({ error: 'Autenticación fallida: el PIN de seguridad de 4 dígitos no coincide.' });
        }

        const esIgualActual = await bcrypt.compare(password_nuevo, usuario.password_hash);
        if (esIgualActual) {
            return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
        }

        const nuevoHash = await bcrypt.hash(password_nuevo, 10);
        await bankRepository.actualizarPasswordHash(cliente.id, nuevoHash);

        // Rotar identificador de sesión manteniendo sesiones aisladas activas
        const prevCliente = req.session.cliente;
        const prevAdmin = req.session.admin;
        const prevCajero = req.session.cajero;

        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) return reject(err);
                req.session.cliente = prevCliente;
                req.session.usuario = prevCliente;
                if (prevAdmin) req.session.admin = prevAdmin;
                if (prevCajero) {
                    req.session.cajero = prevCajero;
                    req.session.cajeroCuenta = prevCajero;
                }
                req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
            });
        });

        return res.json({
            exito: true,
            mensaje: '¡Contraseña actualizada con éxito! Autenticación reforzada verificada y sesión asegurada.',
        });
    } catch (error) {
        console.error('Error en cambiarPassword:', error.message);
        return res.status(500).json({ error: 'Error al cambiar contraseña.' });
    }
}

// 6. Simular pago en Datáfono (Compra POS con Tarjeta)
async function pagoTarjeta(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        let { cuenta_id, valor, establecimiento, pin } = req.body;
        valor = parseFloat(valor);
        if (!valor || Number.isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El monto de la compra debe ser mayor a $0.' });
        }

        const comercio = establecimiento && establecimiento.toString().trim()
            ? establecimiento.toString().trim().slice(0, 120)
            : 'Establecimiento Comercial (POS Datáfono)';

        const comprobante = await bankRepository.procesarPagoTarjetaPos({
            cuenta_id,
            usuarioId: cliente.id,
            valor,
            comercio,
            pin,
            bcrypt,
        });

        return res.json({
            exito: true,
            mensaje: '¡Pago en datáfono aprobado con éxito!',
            comprobante,
        });
    } catch (error) {
        console.error('Error en pagoTarjeta:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error al procesar el pago con la tarjeta.',
        });
    }
}

// 7. Bloqueo estricto contra auto-recarga: un cliente NUNCA puede ponerse saldo
async function ajustarPlataTarjeta(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado' });

        let { cuenta_id, valor, tipo } = req.body;
        if (tipo !== 'QUITAR') {
            return res.status(403).json({
                error: 'Operación prohibida: ningún cliente puede acreditarse saldo por sí mismo. Solicita una consignación en ventanilla.',
            });
        }

        valor = parseFloat(valor);
        if (!valor || Number.isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'El valor debe ser superior a $0 COP.' });
        }

        const nuevoSaldo = await bankRepository.retirarSaldoTarjeta({
            usuarioId: cliente.id,
            cuenta_id,
            valor,
        });

        return res.json({
            exito: true,
            mensaje: `Se retiraron $${valor.toLocaleString('es-CO')} COP de la tarjeta con éxito.`,
            nuevo_saldo: nuevoSaldo,
        });
    } catch (error) {
        console.error('Error en ajustarPlataTarjeta:', error.message);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Error al actualizar el saldo de la tarjeta.',
        });
    }
}

// 8. Generar código OTP de 6 dígitos para sacar dinero en cajero ATM
async function solicitarCodigoRetiro(req, res) {
    try {
        const cliente = getCliente(req);
        if (!cliente) return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión en la Banca Virtual.' });

        const { cuenta_id, numero_cuenta } = req.body || {};
        const cuenta = await bankRepository.findCuentaActivaParaOtp(cliente.id, cuenta_id, numero_cuenta);

        if (!cuenta) {
            return res.status(404).json({ error: 'No se encontró cuenta activa para generar código de retiro.' });
        }

        const { codigo, expiraMinutos } = generarCodigoRetiro(cliente.id, cuenta.id, cuenta.numero_cuenta);

        return res.json({
            exito: true,
            mensaje: 'Código de retiro para cajero ATM generado con éxito.',
            codigo,
            expira_minutos: expiraMinutos,
            numero_cuenta: cuenta.numero_cuenta,
            saldo: parseFloat(cuenta.saldo),
        });
    } catch (error) {
        console.error('Error al generar código de retiro:', error.message);
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
    solicitarCodigoRetiro,
};
