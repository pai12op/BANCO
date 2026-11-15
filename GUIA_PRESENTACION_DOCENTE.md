# Guion de Presentación y Sustentación — Simulador Bancario Web

**Estudiante:** Jairo Andrés Pai Guanga  
**Carrera:** Ingeniería en Ciberseguridad — Universidad de Manizales  
**Materia:** Proyecto Integrador de Programación Web  
**Entregables:** Repositorio GitHub, Código Fuente, `database.sql`, `README.md`, Diagrama BD 3NF, Sistema Funcional en Vivo.

---

## Resumen Ejecutivo del Proyecto (Pitch de 60 segundos)
> *"Profesor, para este proyecto integrador no solo cumplí con los 3 módulos obligatorios (**Banca Virtual, Cajero ATM y Consola Administrativa**), sino que estructuré la base de datos bajo un estricto modelo relacional en **Tercera Forma Normal (3NF)** con 13 tablas en MySQL (motor InnoDB), garantizando integridad referencial y propiedades ACID. En el backend implementé **Node.js con Express**, transacciones concurrentes con bloqueo `FOR UPDATE`, y hashing unidireccional de contraseñas y PINs con **Bcrypt (10 salt rounds)**. En el frontend construí una interfaz fintech moderna con **React 19 y Tailwind CSS**, 100% responsiva (Mobile, Tablet y Desktop), e integré valor agregado como el cálculo del impuesto colombiano 4x1000 y tarjeta débito interactiva con simulación de datáfono POS."*

---

## Flujo de Prueba Mínima Obligatoria (Páginas 9 y 10 del PDF)

Sigue exactamente estos 9 pasos para demostrar la integración en vivo en menos de 3 minutos:

| Paso | Módulo / URL | Acción a realizar | Resultado a mostrar al Docente |
| :---: | :--- | :--- | :--- |
| **1** | **Banca Virtual**<br>`http://localhost:8080` | Iniciar sesión como cliente:<br>• Usuario: `andres@cliente.com`<br>• Clave: `Banco123*` | Mostrar en pantalla el saldo inicial de **$1.000.000 COP**, número de cuenta `400110203040` y tipo Ahorros. |
| **2** | **Cajero Automático**<br>`http://localhost:8080/cajero` | Ingresar con credenciales ATM:<br>• No. Cuenta: `400110203040`<br>• PIN: `1234` | Se abre la pantalla LCD azul del cajero con las opciones de autoservicio. |
| **3** | **Cajero Automático** | Presionar **Retirar Efectivo** y seleccionar el botón de **$200.000 COP**. | El cajero procesa la transacción, descuenta el saldo en MySQL, emite el **voucher térmico impreso** y muestra saldo en pantalla: **$800.000 COP**. |
| **4** | **Banca Virtual**<br>`http://localhost:8080` | Regresar a la pestaña de Banca Virtual y recargar / ver resumen. | El saldo se redujo inmediatamente a **$800.000 COP**. En la tabla de movimientos aparece: *`Retiro de efectivo en cajero automático (-$200.000)`*. |
| **5** | **Consola Admin**<br>`http://localhost:8080/admin` | Iniciar sesión administrativa:<br>• Usuario: `admin@banco.com`<br>• Clave: `Banco123*` | Mostrar los 4 KPIs del dashboard: Clientes registrados (3), Cuentas activas (2), Bloqueadas (1), y Total en Bóveda actualizado. |
| **6** | **Consola Admin** | En la tabla de clientes, buscar la cuenta `400110203040` de Andrés Pai. | Mostrar que el panel administrativo refleja exactamente los mismos **$800.000 COP** en tiempo real. |
| **7** | **Consola Admin** | Hacer clic en **Consignar en Ventanilla**, seleccionar la cuenta `400110203040` y consignar **$100.000 COP**. | Se genera el comprobante de caja institucional y el nuevo saldo pasa a **$900.000 COP**. |
| **8** | **Banca Virtual** | Volver a la Banca Virtual del cliente. | El cliente ahora tiene **$900.000 COP** y el nuevo movimiento *`Consignación en ventanilla (+$100.000)`*. |
| **9** | **Banca Virtual** | Probar **Transferencia** hacia la cuenta de Valentina (`500190807060`). | Transferir $50.000 COP con desglose opcional del 4x1000. Ambas cuentas actualizan sus saldos y se generan los asientos débito/crédito. |

---

## Preguntas Clave que puede hacer el Docente y Cómo Responderlas

### 1. ¿Cómo garantizan que si dos personas retiran al mismo tiempo no quede el saldo negativo?
> *"En el backend (`cajeroController.js` y `usuarioController.js`), toda transacción inicia con `connection.beginTransaction()` y una consulta `SELECT saldo FROM cuentas WHERE id = ? FOR UPDATE`. Esto bloquea la fila a nivel de motor InnoDB en MySQL hasta que se ejecute el `COMMIT`. Si otra transacción intenta leer o modificar el mismo saldo, queda en cola atómica, previniendo condiciones de carrera (Race Conditions)."*

### 2. ¿Por qué la base de datos está en 3NF (Tercera Forma Normal)?
> *"Porque se eliminaron todas las dependencias parciales y transitivas:
> - Catálogos atómicos independientes (`tipos_documento`, `roles`, `estados_usuario`, `tipos_cuenta`, `estados_cuenta`, `canales`, `tipos_operacion`).
> - Separación estricta entre **Usuarios**, **Cuentas** y **Operaciones**.
> - La tabla `movimientos` almacena los asientos de débito y crédito vinculados a una operación global y a una cuenta particular, sin duplicar nombres ni datos del usuario."*

### 3. ¿Cómo manejan la seguridad de contraseñas y sesiones?
> *"Las contraseñas de acceso y los PINs de 4 dígitos del cajero nunca se guardan en texto plano; se utiliza **bcryptjs** con 10 rondas de salt. Las sesiones utilizan cookies `httpOnly`, lo que previene que ataques XSS en el navegador puedan robar la cookie de sesión."*

### 4. ¿Qué pasa si una cuenta o cliente está bloqueado?
> *"El backend valida el estado antes de procesar retiros, transferencias o consignaciones. En el seed de prueba, el cliente `mateo@cliente.com` está con estado `BLOQUEADO`. Si intentamos transferirle o retirar desde su cuenta, el sistema rechaza la operación informando que la cuenta o cliente se encuentra inactivo o bloqueado."*

---

## Características Adicionales (Puntos Extra)
1. **Tarjeta Interactiva 3D tipo Nequi:** Giro frontal y reverso, botón para copiar número, revelar CVV con autenticación visual.
2. **Datáfono POS Simulado:** Simulación de cobro en comercios (Juan Valdez, Éxito) con impacto en saldo y movimiento real.
3. **Simulador Tributario Colombiano 4x1000 (GMF):** Cálculo automático con switch de exención según el Art. 879 del Estatuto Tributario.
4. **Exportador a PDF / Impresión:** Diagrama de Base de Datos interactivo listo para imprimir (`DIAGRAMA_BASE_DATOS.html`).
