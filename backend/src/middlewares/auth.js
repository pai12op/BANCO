// src/middlewares/auth.js

function requireCliente(req, res, next) {
    if (!req.session.usuario || req.session.usuario.rol_id !== 2) {
        return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión en la Banca Virtual.' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.usuario || req.session.usuario.rol_id !== 1) {
        return res.status(401).json({ error: 'No autorizado. Se requieren credenciales de Administrador.' });
    }
    next();
}

function requireCajero(req, res, next) {
    if (!req.session.cajeroCuenta) {
        return res.status(401).json({ error: 'Sesión de cajero no activa. Ingrese su número de cuenta y PIN.' });
    }
    next();
}

module.exports = {
    requireCliente,
    requireAdmin,
    requireCajero
};
