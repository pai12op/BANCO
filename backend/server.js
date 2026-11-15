// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const cajeroRoutes = require('./src/routes/cajeroRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para procesar body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'banco_andino_super_secret_session_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true en HTTPS de producción
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
}));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API REST
app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/banca', usuarioRoutes); // Alias retrocompatible
app.use('/api/cajero', cajeroRoutes);
app.use('/api/admin', adminRoutes);

// Rutas de navegación directa para frontend
app.get('/banca', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'banca.html'));
});

app.get('/cajero', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cajero.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores no capturados
app.use((err, req, res, next) => {
    console.error('Error global:', err);
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor bancario.' });
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`SIMULADOR BANCARIO WEB — SERVICIO ACTIVO`);
    console.log(`Servidor escuchando en: http://localhost:${PORT}`);
    console.log(`Modulos integrados:`);
    console.log(`   - Portal Principal:   http://localhost:${PORT}/`);
    console.log(`   - Banca Virtual:      http://localhost:${PORT}/banca`);
    console.log(`   - Cajero Automatico:  http://localhost:${PORT}/cajero`);
    console.log(`   - Panel Admin:        http://localhost:${PORT}/admin`);
    console.log(`=======================================================`);
});
