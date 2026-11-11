# 🏦 Proyecto Integrador — Simulador Bancario Web

Sistema web multi-módulo que simula las operaciones fundamentales de una entidad bancaria comercial, integrado sobre una base de datos centralizada en MySQL y un backend transaccional en Node.js y Express.

---

## 👥 Integrantes
* **Jairo Andrés Pai Guanga** — Desarrollador Full-Stack & Diseñador UI/UX

---

## 🛠️ Tecnologías Utilizadas

### Backend
* **Node.js** (v24+)
* **Express.js** (Servidor HTTP y API REST)
* **mysql2/promise** (Pool de conexiones y transacciones ACID en MySQL)
* **express-session** (Manejo de sesiones autenticadas HTTP-Only)
* **bcryptjs** (Cifrado unidireccional de contraseñas y PINs con salt rounds)
* **dotenv** (Gestión de variables de entorno seguras)

### Base de Datos
* **MySQL / MariaDB** (Motor InnoDB para garantizar propiedades ACID de consistencia transaccional y claves foráneas).
* **Diseño en Tercera Forma Normal (3NF)**: Cumplimiento estricto para evitar redundancias de almacenamiento y anomalías de actualización.

### Frontend
* **HTML5 semántico** y **CSS3 nativo corporativo** (Diseño Fintech institucional con microinteracciones sobrias, sin clichés ni plantillas genéricas de IA).
* **JavaScript nativo (ES6+)** con Fetch API reactiva para consumo de servicios REST.

---

## 🏛️ Arquitectura del Sistema (3 Módulos Integrados)

El sistema opera sobre una **única base de datos centralizada**, de modo que cualquier transacción realizada desde cualquiera de los canales se refleja de forma instantánea en los demás:

1. 🌐 **Módulo de Cliente — Banca Virtual (`/banca`):**
   * Inicio de sesión seguro con correo o documento + contraseña.
   * Visualización de tarjeta de débito con saldo disponible en tiempo real.
   * Historial de movimientos con fecha, concepto, canal, valor y saldo resultante.
   * Transferencias electrónicas inmediatas hacia otras cuentas registradas en el banco (con bloqueo de saldo, validación de cuenta activa y generación de comprobante).
   * Modificación de información de perfil (teléfono) y cambio de contraseña.

2. 🏧 **Módulo de Cajero Automático Virtual ATM (`/cajero`):**
   * Simulación visual de terminal de autoservicio de cajero físico (pantalla CRT de alto contraste y teclado numérico PINPAD interactivo).
   * Identificación por número de cuenta y PIN de 4 dígitos.
   * Consulta de saldo en pantalla.
   * Retiro rápido de efectivo ($20.000, $50.000, $100.000, $200.000, etc.) con validación de saldo suficiente y múltiplos de $10.000 COP.
   * Emisión de recibo / comprobante térmico con número de transacción y nuevo saldo.
   * Visualización de los últimos 5 movimientos.

3. 🛡️ **Módulo Administrativo del Banco (`/admin`):**
   * Consola central de backoffice bancario para funcionarios y administradores.
   * **Dashboard con los 4 indicadores obligatorios:**
     * Cantidad total de clientes.
     * Cantidad de cuentas bancarias activas.
     * Cantidad de clientes o cuentas bloqueadas.
     * Suma total de los saldos almacenados en bóveda.
   * Registro y creación de nuevos clientes con asignación automática de cuenta bancaria y saldo inicial.
   * Búsqueda en tiempo real de clientes por documento, nombre o número de cuenta.
   * Habilitación y bloqueo de clientes (estados: `ACTIVO`, `INACTIVO`, `BLOQUEADO`).
   * Ventanilla de consignación en efectivo con comprobante oficial.
   * Auditoría general de todos los movimientos del banco.

---

## 📋 Requisitos para Ejecutar el Proyecto
* **Node.js** (v18 o superior) y **npm**.
* **MySQL Server** o **XAMPP / MariaDB** ejecutándose en el puerto `3306`.

---

## ⚙️ Instrucciones de Instalación y Configuración

### 1. Clonar o descargar el repositorio
```bash
git clone https://github.com/pai12op/simulador-bancario-web.git
cd simulador_bancario
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```

### 3. Configurar la Base de Datos MySQL
1. Abrir phpMyAdmin (`http://localhost/phpmyadmin`) o la consola de MySQL.
2. Importar el script `database.sql` ubicado en la raíz del proyecto:
   ```bash
   mysql -u root -p < database.sql
   ```
   *(El script crea la base de datos `simulador_bancario`, sus 12 tablas en 3NF con claves foráneas, restricciones y los datos iniciales de prueba).*

### 4. Configurar variables de entorno (`.env`)
Verificar el archivo `.env` en la raíz con sus credenciales de base de datos:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=simulador_bancario
DB_PORT=3306
SESSION_SECRET=simulador_bancario_secret_key_2026_andres_pai
```

### 5. Iniciar la Aplicación
```bash
node server.js
```
El servidor quedará disponible en: `http://localhost:3000`.

---

## 🔑 Usuarios y Credenciales de Prueba (Seed Data)

| Módulo | Usuario / Cuenta | Clave / PIN | Rol / Estado | Saldo Inicial |
| :--- | :--- | :--- | :---: | :---: |
| **Admin** | `admin@banco.com` | `Banco123*` | Administrador (Activo) | N/A |
| **Banca / Cliente 1** | `andres@cliente.com` (C.C. 1001234567) | `Banco123*` | Cliente (Activo) | Cuenta Ahorros `400110203040` — **$1.000.000 COP** |
| **Banca / Cliente 2** | `valentina@cliente.com` (C.C. 1002345678) | `Banco123*` | Cliente (Activo) | Cuenta Corriente `500190807060` — **$2.500.000 COP** |
| **Banca / Cliente 3** | `mateo@cliente.com` (C.C. 1003456789) | `Banco123*` | Cliente (**Bloqueado**) | Cuenta Ahorros `400155667788` — **$350.000 COP** |
| **Cajero ATM** | No. Cuenta: `400110203040` | PIN: `1234` | Cliente Activo | Saldo disponible para retiro |

---

## 🎯 Prueba Mínima de Funcionamiento (Páginas 9-10 de la Guía)
Para demostrar la integración total entre los módulos ante el docente, ejecute la siguiente secuencia en vivo:
1. Ingrese a la **Banca Virtual** (`http://localhost:3000/banca`) con `andres@cliente.com` y verifique su saldo: **$1.000.000 COP**.
2. Abra el **Cajero Automático** (`http://localhost:3000/cajero`) e ingrese la cuenta `400110203040` y PIN `1234`.
3. Pulse **Retirar Dinero** y seleccione **$200.000 COP**. El cajero dispensará el efectivo y mostrará el nuevo saldo: **$800.000 COP**.
4. Regrese a la pestaña de la Banca Virtual y pulse **Actualizar Saldos**: El saldo aparecerá inmediatamente en **$800.000 COP** y en la tabla se reflejará el movimiento: *`Retiro de efectivo en cajero automático: -$200.000`*.
5. Ingrese a la **Consola Administrativa** (`http://localhost:3000/admin`), vaya a **Consignar en Ventanilla**, ingrese la cuenta `400110203040` y consigne **$100.000 COP**.
6. El cliente recarga su Banca Virtual y verá su saldo actualizado en **$900.000 COP** con el comprobante de consignación.
