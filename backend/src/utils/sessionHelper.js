// src/utils/sessionHelper.js
// Utilidad para leer, aislar y rotar sesiones de módulos bancarios (cliente, admin, cajero)
function getClienteSession(req) {
    return req.session.cliente || req.session.usuario || null;
}

function getCajeroSession(req) {
    return req.session.cajero || req.session.cajeroCuenta || null;
}

function getAdminSession(req) {
    return req.session.admin || req.session.usuario || null;
}

async function rotateSessionPreservingModules(req) {
    const prevCliente = req.session.cliente;
    const prevAdmin = req.session.admin;
    const prevCajero = req.session.cajero;

    await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            if (prevCliente) {
                req.session.cliente = prevCliente;
                req.session.usuario = prevCliente;
            }
            if (prevAdmin) {
                req.session.admin = prevAdmin;
            }
            if (prevCajero) {
                req.session.cajero = prevCajero;
                req.session.cajeroCuenta = prevCajero;
            }
            req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
        });
    });
}

module.exports = {
    getClienteSession,
    getCajeroSession,
    getAdminSession,
    rotateSessionPreservingModules,
};
