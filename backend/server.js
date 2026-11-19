// server.js — Banca Rota API
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const {
    securityHeaders,
    decryptRequestBody,
    antiSqlInjectionGuard,
} = require('./src/middlewares/security');

const authRoutes = require('./src/routes/authRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const cajeroRoutes = require('./src/routes/cajeroRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(decryptRequestBody);
app.use(antiSqlInjectionGuard);

app.use(session({
    name: 'bancarota.sid',
    secret: process.env.SESSION_SECRET || FALLBACK_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: 'auto',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2,
    },
}));

app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/banca', usuarioRoutes);
app.use('/api/cajero', cajeroRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
    console.error('[BancaRota Error]:', err.message);
    res.status(err.statusCode || 500).json({ error: 'Ocurrió un error al procesar la solicitud bancaria.' });
});

app.listen(PORT, () => {
    console.log(`[Banca Rota] API segura activa en puerto ${PORT}`);
});
