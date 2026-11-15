# Documentación y Manual de Usuario — Banca Rota

Este documento contiene la descripción operativa, casos de prueba y guía de usuario del sistema bancario **Banca Rota**.

---

## Equipo de Trabajo
* **Jairo Andrés Pai Guanga** — Arquitectura de Software, Backend y Frontend
* **Melisa Pinilla** — Documentación Técnica, Casos de Prueba y Manual de Usuario
* **Isabella Caviedes** — Diseño Funcional, Presentación y Validación de Procesos

---

## 1. Guía de Uso del Cajero Automático (ATM)
1. Ingrese a la ruta `/cajero` en la plataforma.
2. Digite el número de cuenta y el PIN de 4 dígitos (predeterminado: `1234`).
3. Seleccione la operación deseada:
   - Consulta de Saldo en Pantalla.
   - Retiro Rápido ($20.000, $50.000, $100.000, $200.000).
   - Retiro por Otro Valor.
4. El sistema valida fondos suficientes, actualiza el saldo de forma atómica y descuenta el 4x1000 reglamentario si aplica.

---

## 2. Guía de Transferencias entre Cuentas
1. Inicie sesión en la Banca Virtual con su Cédula y Contraseña.
2. Diríjase a la sección **Transferencias**.
3. Seleccione el contacto destino o digite el número de cuenta de 12 dígitos.
4. Ingrese el monto a transferir y el concepto de la transacción.
5. Confirme con su clave dinámica y descargue el comprobante digital con código de auditoría.

---

## 3. Casos de Prueba Realizados
| ID | Módulo | Caso de Prueba | Resultado Esperado | Estado |
|---|---|---|---|---|
| CP-01 | Autenticación | Login con credenciales válidas | Acceso concedido al panel | Exitoso |
| CP-02 | Autenticación | Bloqueo tras 3 intentos erróneos | Cuenta bloqueada por seguridad | Exitoso |
| CP-03 | Cajero ATM | Retiro con saldo insuficiente | Mensaje de fondos insuficientes | Exitoso |
| CP-04 | Transferencias | Transferencia con cálculo 4x1000 | Débito exacto + GMF | Exitoso |
| CP-05 | Admin | Auditoría y trazabilidad en vivo | Registro de log contable | Exitoso |
