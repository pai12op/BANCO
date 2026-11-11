-- ==============================================================================
-- PROYECTO INTEGRADOR: SIMULADOR BANCARIO WEB
-- BASE DE DATOS: simulador_bancario
-- MOTOR: MySQL / MariaDB (InnoDB, UTF-8)
-- DISEÑO: Tercera Forma Normal (3NF) - Sin redundancias anómalas
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `simulador_bancario` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `simulador_bancario`;

-- Deshabilitar chequeo de claves foráneas temporalmente para recreación limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `transferencias`;
DROP TABLE IF EXISTS `movimientos`;
DROP TABLE IF EXISTS `operaciones`;
DROP TABLE IF EXISTS `estados_operacion`;
DROP TABLE IF EXISTS `canales`;
DROP TABLE IF EXISTS `tipos_operacion`;
DROP TABLE IF EXISTS `cuentas`;
DROP TABLE IF EXISTS `estados_cuenta`;
DROP TABLE IF EXISTS `tipos_cuenta`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `estados_usuario`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `tipos_documento`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. TABLAS MAESTRAS DE CATÁLOGO / TIPOS (3NF)
-- ------------------------------------------------------------------------------

CREATE TABLE `tipos_documento` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(10) NOT NULL UNIQUE,
    `nombre` VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `roles` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `estados_usuario` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `tipos_cuenta` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `estados_cuenta` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `estados_operacion` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `tipos_operacion` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `canales` (
    `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. TABLA DE USUARIOS (Clientes y Administradores)
-- ------------------------------------------------------------------------------

CREATE TABLE `usuarios` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tipo_documento_id` TINYINT UNSIGNED NOT NULL,
    `numero_documento` VARCHAR(25) NOT NULL,
    `nombres` VARCHAR(80) NOT NULL,
    `apellidos` VARCHAR(80) NOT NULL,
    `correo` VARCHAR(120) NOT NULL UNIQUE,
    `telefono` VARCHAR(25) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol_id` TINYINT UNSIGNED NOT NULL,
    `estado_id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuario_tipo_doc` FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipos_documento` (`id`),
    CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`),
    CONSTRAINT `fk_usuario_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_usuario` (`id`),
    CONSTRAINT `uk_usuario_documento` UNIQUE (`tipo_documento_id`, `numero_documento`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. TABLA DE CUENTAS BANCARIAS
-- ------------------------------------------------------------------------------

CREATE TABLE `cuentas` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `numero_cuenta` VARCHAR(20) NOT NULL UNIQUE,
    `tipo_id` TINYINT UNSIGNED NOT NULL,
    `estado_id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `pin_hash` VARCHAR(255) NOT NULL,
    `saldo` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `creada_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cuenta_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_cuenta_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `tipos_cuenta` (`id`),
    CONSTRAINT `fk_cuenta_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_cuenta` (`id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. TABLA DE OPERACIONES GLOBALES (Transacción Financiera General)
-- ------------------------------------------------------------------------------

CREATE TABLE `operaciones` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tipo_id` TINYINT UNSIGNED NOT NULL,
    `estado_id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `canal_id` TINYINT UNSIGNED NOT NULL,
    `realizado_por` BIGINT UNSIGNED NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `creada_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_operacion_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `tipos_operacion` (`id`),
    CONSTRAINT `fk_operacion_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_operacion` (`id`),
    CONSTRAINT `fk_operacion_canal` FOREIGN KEY (`canal_id`) REFERENCES `canales` (`id`),
    CONSTRAINT `fk_operacion_usuario` FOREIGN KEY (`realizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. TABLA DE MOVIMIENTOS CONTABLES (Asientos Débito / Crédito por Cuenta)
-- ------------------------------------------------------------------------------

CREATE TABLE `movimientos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `operacion_id` BIGINT UNSIGNED NOT NULL,
    `cuenta_id` BIGINT UNSIGNED NOT NULL,
    `sentido` ENUM('DEBITO', 'CREDITO') NOT NULL,
    `saldo_resultante` DECIMAL(15, 2) NOT NULL,
    `creada_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_movimiento_operacion` FOREIGN KEY (`operacion_id`) REFERENCES `operaciones` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_movimiento_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. TABLA DE TRANSFERENCIAS (Subtipo relacional 1:1 con Operaciones)
-- ------------------------------------------------------------------------------

CREATE TABLE `transferencias` (
    `operacion_id` BIGINT UNSIGNED PRIMARY KEY,
    `cuenta_origen_id` BIGINT UNSIGNED NOT NULL,
    `cuenta_destino_id` BIGINT UNSIGNED NOT NULL,
    CONSTRAINT `fk_transferencia_operacion` FOREIGN KEY (`operacion_id`) REFERENCES `operaciones` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_transferencia_origen` FOREIGN KEY (`cuenta_origen_id`) REFERENCES `cuentas` (`id`),
    CONSTRAINT `fk_transferencia_destino` FOREIGN KEY (`cuenta_destino_id`) REFERENCES `cuentas` (`id`)
) ENGINE=InnoDB;

-- ==============================================================================
-- INSERCIÓN DE DATOS DE CATÁLOGO (DOMINIOS FIJOS)
-- ==============================================================================

INSERT INTO `tipos_documento` (`id`, `codigo`, `nombre`) VALUES
(1, 'CC', 'Cédula de Ciudadanía'),
(2, 'CE', 'Cédula de Extranjería'),
(3, 'PAS', 'Pasaporte');

INSERT INTO `roles` (`id`, `nombre`) VALUES
(1, 'Administrador'),
(2, 'Cliente');

INSERT INTO `estados_usuario` (`id`, `nombre`) VALUES
(1, 'ACTIVO'),
(2, 'INACTIVO'),
(3, 'BLOQUEADO');

INSERT INTO `tipos_cuenta` (`id`, `nombre`) VALUES
(1, 'Ahorros'),
(2, 'Corriente');

INSERT INTO `estados_cuenta` (`id`, `nombre`) VALUES
(1, 'ACTIVA'),
(2, 'INACTIVA'),
(3, 'BLOQUEADA');

INSERT INTO `estados_operacion` (`id`, `nombre`) VALUES
(1, 'EXITOSA'),
(2, 'PENDIENTE'),
(3, 'FALLIDA'),
(4, 'RECHAZADA');

INSERT INTO `tipos_operacion` (`id`, `nombre`) VALUES
(1, 'Consignación'),
(2, 'Retiro Cajero'),
(3, 'Transferencia Enviada'),
(4, 'Transferencia Recibida');

INSERT INTO `canales` (`id`, `nombre`) VALUES
(1, 'Cajero Automático'),
(2, 'Banca Virtual Web'),
(3, 'Ventanilla Administrativa');

-- ==============================================================================
-- DATOS DE PRUEBA EXIGIDOS POR EL PROYECTO (1 ADMIN + 3 CLIENTES)
-- Nota de Seguridad:
-- Contraseña general de prueba: 'Banco123*' (Hasheada con bcrypt 10 salt rounds)
-- PIN de cajero general de prueba: '1234' (Hasheado con bcrypt 10 salt rounds)
-- Hash bcrypt para 'Banco123*': $2b$10$yhjLcIIlWUg6Kd7kz2e53uhQhmPvwaY4B.jh6T/wC5as4VucS9ttq
-- Hash bcrypt para '1234':      $2b$10$jXnIXzZcx1ye9AfyCcbSQe/mhAY5glX.cAf4HFLNwJSHVzhzpBMSq
-- ==============================================================================

-- 1. Administrador del Sistema
INSERT INTO `usuarios` (`id`, `tipo_documento_id`, `numero_documento`, `nombres`, `apellidos`, `correo`, `telefono`, `password_hash`, `rol_id`, `estado_id`) VALUES
(1, 1, '1053800900', 'Carlos Alberto', 'Mendoza Vélez', 'admin@banco.com', '3001234567', '$2b$10$yhjLcIIlWUg6Kd7kz2e53uhQhmPvwaY4B.jh6T/wC5as4VucS9ttq', 1, 1);

-- 2. Tres Clientes con diferentes situaciones
INSERT INTO `usuarios` (`id`, `tipo_documento_id`, `numero_documento`, `nombres`, `apellidos`, `correo`, `telefono`, `password_hash`, `rol_id`, `estado_id`) VALUES
(2, 1, '1001234567', 'Jairo Andrés', 'Pai Guanga', 'andres@cliente.com', '3234594161', '$2b$10$yhjLcIIlWUg6Kd7kz2e53uhQhmPvwaY4B.jh6T/wC5as4VucS9ttq', 2, 1),
(3, 1, '1002345678', 'Valentina', 'Gómez Jaramillo', 'valentina@cliente.com', '3109876543', '$2b$10$yhjLcIIlWUg6Kd7kz2e53uhQhmPvwaY4B.jh6T/wC5as4VucS9ttq', 2, 1),
(4, 1, '1003456789', 'Mateo', 'Morales Restrepo', 'mateo@cliente.com', '3155554433', '$2b$10$yhjLcIIlWUg6Kd7kz2e53uhQhmPvwaY4B.jh6T/wC5as4VucS9ttq', 2, 3); -- Estado Bloqueado para pruebas

-- 3. Cuentas bancarias de los clientes
-- Cuenta 1: Andrés Pai -> Saldo exacto para la prueba mínima del docente: $1.000.000 COP
-- Cuenta 2: Valentina Gómez -> $2.500.000 COP (Lista para recibir transferencias)
-- Cuenta 3: Mateo Morales -> $350.000 COP (Cuenta Bloqueada para probar reglas de negocio)
INSERT INTO `cuentas` (`id`, `usuario_id`, `numero_cuenta`, `tipo_id`, `estado_id`, `pin_hash`, `saldo`) VALUES
(1, 2, '400110203040', 1, 1, '$2b$10$jXnIXzZcx1ye9AfyCcbSQe/mhAY5glX.cAf4HFLNwJSHVzhzpBMSq', 1000000.00),
(2, 3, '500190807060', 2, 1, '$2b$10$jXnIXzZcx1ye9AfyCcbSQe/mhAY5glX.cAf4HFLNwJSHVzhzpBMSq', 2500000.00),
(3, 4, '400155667788', 1, 3, '$2b$10$jXnIXzZcx1ye9AfyCcbSQe/mhAY5glX.cAf4HFLNwJSHVzhzpBMSq', 350000.00);

-- 4. Movimientos iniciales de apertura para trazabilidad contable
INSERT INTO `operaciones` (`id`, `tipo_id`, `estado_id`, `canal_id`, `realizado_por`, `valor`, `descripcion`, `creada_en`) VALUES
(1, 1, 1, 3, 1, 1000000.00, 'Depósito inicial de apertura en ventanilla', '2026-11-01 09:00:00'),
(2, 1, 1, 3, 1, 2500000.00, 'Depósito inicial de apertura en ventanilla', '2026-11-02 10:15:00'),
(3, 1, 1, 3, 1, 350000.00, 'Depósito inicial de apertura en ventanilla', '2026-11-03 11:30:00');

INSERT INTO `movimientos` (`id`, `operacion_id`, `cuenta_id`, `sentido`, `saldo_resultante`, `creada_en`) VALUES
(1, 1, 1, 'CREDITO', 1000000.00, '2026-11-01 09:00:00'),
(2, 2, 2, 'CREDITO', 2500000.00, '2026-11-02 10:15:00'),
(3, 3, 3, 'CREDITO', 350000.00, '2026-11-03 11:30:00');

COMMIT;
