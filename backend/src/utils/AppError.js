// src/utils/AppError.js
// Error de dominio operacional y manejador uniforme de respuestas HTTP para controladores
class AppError extends Error {
    constructor(message, statusCode = 400, code = undefined) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        if (code) this.code = code;
    }
}

function handleControllerError(res, error, context, fallbackMessage) {
    console.error(`[${context}]:`, error.message);
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            error: error.message,
            ...(error.code ? { code: error.code } : {}),
        });
    }
    return res.status(500).json({ error: fallbackMessage });
}

module.exports = {
    AppError,
    handleControllerError,
};
