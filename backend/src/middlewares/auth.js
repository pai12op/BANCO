// src/middlewares/auth.js

function requireCliente(req, res, next) {
    const cliente = req.session.cliente || (req.session.usuario && req.session.usuario.rol_id === 2 ? req.session.usuario : null);
    if (!cliente) {
        return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión en la Banca Virtual.' });
    }
    req.session.cliente = cliente;
    next();
}

function requireAdmin(req, res, next) {
    const admin = req.session.admin || (req.session.usuario && req.session.usuario.rol_id === 1 ? req.session.usuario : null);
    if (!admin) {
        return res.status(401).json({ error: 'No autorizado. Se requieren credenciales de Administrador.' });
    }
    req.session.admin = admin;
    next();
}

function requireCajero(req, res, next) {
    const cajero = req.session.cajero || req.session.cajeroCuenta;
    if (!cajero) {
        return res.status(401).json({ error: 'Sesión de cajero no activa. Ingrese su número de cuenta y PIN.' });
    }
    req.session.cajero = cajero;
    next();
}

module.exports = {
    requireCliente,
    requireAdmin,
    requireCajero
};
