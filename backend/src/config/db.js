// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'simulador_bancario',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
});

function sanitizeParams(params = []) {
    return params.map((p) => (p === undefined ? null : p));
}

/**
 * Ejecuta una sentencia SQL preparada binaria (nunca interpolación de texto).
 */
async function executePrepared(sql, params = []) {
    const [rows] = await pool.execute(sql, sanitizeParams(params));
    return rows;
}

/**
 * Ejecuta una transacción ACID utilizando sentencias preparadas binarias.
 */
async function withTransaction(fn) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const exec = async (sql, params = []) => {
            const [rows] = await connection.execute(sql, sanitizeParams(params));
            return rows;
        };
        const result = await fn(exec, connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    executePrepared,
    withTransaction,
    query: (...args) => pool.execute(...args),
    getConnection: () => pool.getConnection(),
};
