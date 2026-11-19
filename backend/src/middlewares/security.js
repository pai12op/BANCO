// src/middlewares/security.js
// Middlewares de cabeceras seguras, descifrado en tránsito y bloqueo de inyección SQL directa
const { decryptEnvelope } = require('../config/payloadCrypto');

const SQL_PROBE_REGEX = /(\b(union\s+all\s+select|union\s+select|select\s+.+\s+from|insert\s+into|drop\s+table|alter\s+table|delete\s+from|truncate\s+table)\b|\/\*|\*\/|;\s*(select|drop|insert|update|delete))/i;
const SENSITIVE_PASSWORD_FIELDS = new Set([
    'password',
    'password_actual',
    'password_nuevo',
    'password_confirmacion',
    'pin',
    'pin_cajero',
    'codigo',
    'codigoOtp',
    'codigo_retiro',
]);

function securityHeaders(req, res, next) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
    }
    next();
}

function decryptRequestBody(req, res, next) {
    if (req.body && typeof req.body === 'object' && req.body._enc) {
        try {
            req.body = decryptEnvelope(req.body._enc);
            req.wasEncrypted = true;
        } catch (err) {
            return res.status(err.statusCode || 400).json({
                error: err.message || 'Carga útil cifrada inválida.',
                code: err.code || 'INVALID_ENVELOPE',
            });
        }
    }
    next();
}

function requireEncryptedPayload(req, res, next) {
    if (!req.wasEncrypted) {
        return res.status(400).json({
            error: 'Operación rechazada: la información sensible debe enviarse cifrada y nunca en texto plano.',
            code: 'PLAINTEXT_FORBIDDEN',
        });
    }
    next();
}

function inspectMapForSqlProbes(obj, skipSensitiveKeys = false) {
    if (!obj || typeof obj !== 'object') return false;
    for (const [k, v] of Object.entries(obj)) {
        if (skipSensitiveKeys && SENSITIVE_PASSWORD_FIELDS.has(k)) continue;
        if (typeof v === 'string' && SQL_PROBE_REGEX.test(v)) {
            return true;
        }
        if (v && typeof v === 'object' && inspectMapForSqlProbes(v, skipSensitiveKeys)) {
            return true;
        }
    }
    return false;
}

function antiSqlInjectionGuard(req, res, next) {
    if (
        inspectMapForSqlProbes(req.query, false) ||
        inspectMapForSqlProbes(req.params, false) ||
        inspectMapForSqlProbes(req.body, true)
    ) {
        return res.status(400).json({
            error: 'Entrada rechazada por la política de seguridad del núcleo bancario.',
            code: 'INVALID_INPUT_PATTERN',
        });
    }
    next();
}

module.exports = {
    securityHeaders,
    decryptRequestBody,
    requireEncryptedPayload,
    antiSqlInjectionGuard,
};
