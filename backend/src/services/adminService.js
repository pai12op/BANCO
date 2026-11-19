// src/services/adminService.js
// Reglas de negocio administrativas: KPIs, vinculación de clientes, bloqueo/activación, ventanilla y auditoría
const bcrypt = require('bcryptjs');
const adminRepo = require('../repositories/adminRepository');
const { AppError } = require('../utils/AppError');
const {
    assertStrongPassword,
    assertValidPin,
    assertAdultBirthDate,
    parsePositiveAmount,
    cleanAccountIdentifier,
} = require('../utils/validators');

async function obtenerDashboard() {
    return adminRepo.getDashboardAdmin();
}

async function listarClientes(busqueda) {
    return adminRepo.getClientesAdmin(busqueda);
}

async function registrarClienteAdmin(adminId, payload) {
    const {
        tipo_documento_id,
        numero_documento,
        nombres,
        apellidos,
        correo,
        telefono,
        fecha_nacimiento,
        password,
        tipo_cuenta_id,
        pin_cajero,
        saldo_inicial,
    } = payload;

    if (!numero_documento || !nombres || !apellidos || !correo || !password || !pin_cajero) {
        throw new AppError(
            'Todos los campos obligatorios, incluyendo contraseña y PIN de 4 dígitos, deben ser diligenciados.',
            400
        );
    }

    const fechaNacimientoValida = assertAdultBirthDate(fecha_nacimiento, 18);
    const finalPin = assertValidPin(pin_cajero, 'El PIN del cajero');
    assertStrongPassword(password, 'La contraseña del cliente');

    const saldoNum = parseFloat(saldo_inicial) || 0;
    if (saldoNum < 0) {
        throw new AppError('El saldo inicial no puede ser negativo.', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(finalPin, 10);

    return adminRepo.crearClienteAdmin({
        tipo_documento_id,
        numero_documento: numero_documento.toString().trim(),
        nombres: nombres.toString().trim(),
        apellidos: apellidos.toString().trim(),
        correo: correo.toString().trim(),
        telefono: telefono ? telefono.toString().trim() : null,
        fecha_nacimiento: fechaNacimientoValida,
        passwordHash,
        pinHash,
        tipo_cuenta_id,
        saldoNum,
        adminId,
    });
}

async function cambiarEstadoCliente({ usuario_id, nuevo_estado_id }) {
    if (!usuario_id || !nuevo_estado_id) {
        throw new AppError('Datos incompletos.', 400);
    }
    await adminRepo.actualizarEstadoClienteAdmin(usuario_id, nuevo_estado_id);
}

async function consignarVentanilla(adminId, { numero_cuenta, valor, concepto }) {
    const valorNum = parsePositiveAmount(valor, 'El valor de la consignación debe ser mayor a cero ($0).');
    const cuentaLimpia = cleanAccountIdentifier(numero_cuenta);
    if (!cuentaLimpia) {
        throw new AppError('Debe ingresar el número de cuenta de destino.', 400);
    }

    return adminRepo.consignarEnCuentaAdmin({
        adminId,
        numero_cuenta: cuentaLimpia,
        valor: valorNum,
        concepto,
    });
}

async function obtenerAuditoriaGeneral() {
    return adminRepo.getHistorialGeneralAdmin();
}

module.exports = {
    obtenerDashboard,
    listarClientes,
    registrarClienteAdmin,
    cambiarEstadoCliente,
    consignarVentanilla,
    obtenerAuditoriaGeneral,
};
