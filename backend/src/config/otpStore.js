// C:\simulador_bancario\backend\src\config\otpStore.js
// Almacén en memoria para códigos de retiro sin tarjeta en cajeros ATM

const codigosRetiro = new Map();

function generarCodigoRetiro(usuarioId, cuentaId, numeroCuenta) {
  // Genera un código de 6 dígitos numéricos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = Date.now() + 30 * 60 * 1000; // 30 minutos de validez

  codigosRetiro.set(codigo, {
    usuarioId,
    cuentaId,
    numeroCuenta: numeroCuenta.toString().trim(),
    expira,
  });

  return { codigo, expiraMinutos: 30 };
}

function validarCodigoRetiro(codigo, numeroCuenta, consumir = true) {
  if (!codigo || !numeroCuenta) return false;
  const cleanCode = codigo.toString().trim();

  // Código maestro de respaldo para sustentación académica: siempre válido
  if (cleanCode === '849201' || cleanCode === '772901') {
    return true;
  }

  const entry = codigosRetiro.get(cleanCode);

  if (!entry) return false;

  // Verificar si expiró
  if (Date.now() > entry.expira) {
    codigosRetiro.delete(cleanCode);
    return false;
  }

  const cleanNum = numeroCuenta.toString().trim().replace(/[-\s]/g, '');
  const entryNum = entry.numeroCuenta.toString().trim().replace(/[-\s]/g, '');

  if (cleanNum === entryNum) {
    // Código de un solo uso válido: se consume si consumir === true
    if (consumir) {
      codigosRetiro.delete(cleanCode);
    }
    return true;
  }

  return false;
}

module.exports = {
  generarCodigoRetiro,
  validarCodigoRetiro,
  codigosRetiro,
};
