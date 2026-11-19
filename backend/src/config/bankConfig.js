// src/config/bankConfig.js
// Configuración centralizada de la entidad bancaria (desacopla reglas específicas del núcleo)
module.exports = {
    entityName: 'Banca Rota',
    sessionCookieName: 'bancarota.sid',
    requireAdmin2FA: true,
    accountPrefixes: {
        ahorros: '4001',
        corriente: '5001',
    },
    defaultTransferConcept: 'Transferencia Banca Rota',
    defaultConsignacionConcept: 'Consignación en ventanilla — Banca Rota',
};
