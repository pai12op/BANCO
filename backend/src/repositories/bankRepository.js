// src/repositories/bankRepository.js
// Fachada de compatibilidad que re-exporta los repositorios modulares de dominio
module.exports = {
    ...require('./authRepository'),
    ...require('./cuentaRepository'),
    ...require('./cajeroRepository'),
    ...require('./adminRepository'),
};
