// src/config/payloadCrypto.js
// Cifrado híbrido RSA-OAEP (SHA-256) + AES-256-GCM para proteger credenciales y datos sensibles en tránsito
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

const keyId = crypto.randomUUID();
const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

const usedNonces = new Map();
const MAX_NONCE_AGE_MS = 5 * 60 * 1000;

function cleanupExpiredNonces(now) {
    if (usedNonces.size < 2000) return;
    for (const [nonce, expiresAt] of usedNonces.entries()) {
        if (expiresAt <= now) {
            usedNonces.delete(nonce);
        }
    }
}

function getPublicKeyInfo() {
    return {
        keyId,
        algorithm: 'RSA-OAEP-256+AES-256-GCM',
        publicKeySpki,
    };
}

function decryptEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object') {
        const err = new Error('Sobre cifrado inválido.');
        err.statusCode = 400;
        throw err;
    }

    const { keyId: incomingKeyId, encryptedKey, iv, ciphertext } = envelope;

    if (!incomingKeyId || incomingKeyId !== keyId) {
        const err = new Error('Llave de cifrado rotada. Actualizando sesión segura...');
        err.statusCode = 428;
        err.code = 'KEY_ROTATED';
        throw err;
    }

    if (typeof encryptedKey !== 'string' || typeof iv !== 'string' || typeof ciphertext !== 'string') {
        const err = new Error('Campos de cifrado incompletos.');
        err.statusCode = 400;
        throw err;
    }

    let aesKey;
    try {
        aesKey = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(encryptedKey, 'base64')
        );
    } catch {
        const err = new Error('No se pudo descifrar la llave de sesión.');
        err.statusCode = 400;
        throw err;
    }

    if (aesKey.length !== 32) {
        const err = new Error('Longitud de llave AES inválida.');
        err.statusCode = 400;
        throw err;
    }

    const ivBuf = Buffer.from(iv, 'base64');
    const cipherBuf = Buffer.from(ciphertext, 'base64');

    if (ivBuf.length !== 12 || cipherBuf.length < 16) {
        const err = new Error('Parámetros AES-GCM inválidos.');
        err.statusCode = 400;
        throw err;
    }

    const authTag = cipherBuf.subarray(cipherBuf.length - 16);
    const encData = cipherBuf.subarray(0, cipherBuf.length - 16);

    let parsed;
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, ivBuf);
        decipher.setAuthTag(authTag);
        const plain = Buffer.concat([decipher.update(encData), decipher.final()]).toString('utf8');
        parsed = JSON.parse(plain);
    } catch {
        const err = new Error('Fallo de integridad o autenticación en la carga útil cifrada.');
        err.statusCode = 400;
        throw err;
    }

    if (!parsed || typeof parsed !== 'object') {
        const err = new Error('Carga útil inválida.');
        err.statusCode = 400;
        throw err;
    }

    const now = Date.now();
    const ts = Number(parsed._ts);
    const nonce = typeof parsed._nonce === 'string' ? parsed._nonce.trim() : '';

    if (!ts || Math.abs(now - ts) > MAX_NONCE_AGE_MS || !nonce || nonce.length < 8) {
        const err = new Error('Petición expirada o marca temporal inválida.');
        err.statusCode = 400;
        throw err;
    }

    cleanupExpiredNonces(now);
    const existingExpiry = usedNonces.get(nonce);
    if (existingExpiry && existingExpiry > now) {
        const err = new Error('Petición duplicada detectada (protección anti-replay).');
        err.statusCode = 409;
        throw err;
    }
    usedNonces.set(nonce, now + MAX_NONCE_AGE_MS);

    const { _ts, _nonce, ...cleanPayload } = parsed;
    return cleanPayload;
}

module.exports = {
    getPublicKeyInfo,
    decryptEnvelope,
};
