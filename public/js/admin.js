// public/js/admin.js - Lógica de Consola Administrativa Bancaria

let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionAdmin();
});

function formatCOP(valor) {
    const num = parseFloat(valor) || 0;
    return '$' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' COP';
}

function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

async function verificarSesionAdmin() {
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.usuario && data.usuario.rol_id === 1) {
            currentAdmin = data.usuario;
            mostrarAppAdmin();
            await recargarDashboardAdmin();
        } else {
            mostrarLoginAdmin();
        }
    } catch (e) {
        mostrarLoginAdmin();
    }
}

function mostrarLoginAdmin() {
    document.getElementById('adminLoginSection').style.display = 'flex';
    document.getElementById('adminAppLayout').style.display = 'none';
}

function mostrarAppAdmin() {
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminAppLayout').style.display = 'flex';
    document.getElementById('adminNombreNav').innerText = `${currentAdmin.nombres} ${currentAdmin.apellidos}`;
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById('adminLoginAlert');
    alertBox.style.display = 'none';

    const correo = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPass').value;

    try {
        const res = await fetch('/api/auth/login-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });
        const data = await res.json();

        if (!res.ok) {
            alertBox.innerText = data.error || 'Credenciales administrativas incorrectas.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        currentAdmin = data.admin;
        mostrarAppAdmin();
        await recargarDashboardAdmin();
    } catch (err) {
        alertBox.innerText = 'Error de conexión con el servidor.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

function cambiarTab(tabName) {
    const tabs = ['dashboard', 'clientes', 'consignar', 'auditoria'];
    tabs.forEach(t => {
        const el = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (el) el.style.display = (t === tabName) ? 'block' : 'none';
    });

    document.querySelectorAll('.admin-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.innerText.toLowerCase().includes(tabName)) {
            link.classList.add('active');
        }
    });

    if (tabName === 'dashboard') recargarDashboardAdmin();
    if (tabName === 'clientes') cargarClientesAdmin();
    if (tabName === 'auditoria') cargarAuditoriaAdmin();
}

async function recargarDashboardAdmin() {
    try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) return logoutAdmin();
        const data = await res.json();

        document.getElementById('kpiTotalClientes').innerText = data.total_clientes;
        document.getElementById('kpiCuentasActivas').innerText = data.cuentas_activas;
        document.getElementById('kpiBloqueados').innerText = data.clientes_bloqueados + data.cuentas_bloqueadas;
        document.getElementById('kpiSaldoTotal').innerText = formatCOP(data.saldo_total_banco);
    } catch (e) {
        console.error('Error cargando KPIs:', e);
    }
}

async function cargarClientesAdmin(busqueda = '') {
    try {
        const url = busqueda ? `/api/admin/clientes?busqueda=${encodeURIComponent(busqueda)}` : '/api/admin/clientes';
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tbodyClientesAdmin');
        const clientes = data.clientes || [];

        if (clientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron clientes.</td></tr>`;
            return;
        }

        tbody.innerHTML = clientes.map(c => {
            const esBloqueado = c.estado === 'BLOQUEADO';
            const badgeClase = esBloqueado ? 'badge-danger' : (c.estado === 'ACTIVO' ? 'badge-success' : 'badge-warning');
            const btnAccion = esBloqueado ? 
                `<button class="btn btn-success btn-sm" onclick="cambiarEstadoCliente(${c.id}, 1)">Habilitar</button>` :
                `<button class="btn btn-danger btn-sm" onclick="cambiarEstadoCliente(${c.id}, 3)">Bloquear</button>`;

            return `
                <tr>
                    <td style="font-family:var(--font-mono); font-size:12px;">${c.tipo_doc} ${c.numero_documento}</td>
                    <td>
                        <strong>${c.nombres} ${c.apellidos}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${c.correo} | Tel: ${c.telefono || 'Sin tel'}</div>
                    </td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${c.numero_cuenta || 'Sin cuenta'}</td>
                    <td><span class="badge badge-primary">${c.tipo_cuenta || 'N/A'}</span></td>
                    <td style="font-family:var(--font-mono); font-weight:700; color:var(--primary);">${formatCOP(c.saldo || 0)}</td>
                    <td><span class="badge ${badgeClase}">${c.estado}</span></td>
                    <td style="text-align:right;">${btnAccion}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Error cargando clientes:', e);
    }
}

let timeoutBusqueda = null;
function buscarClientes() {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        const q = document.getElementById('busquedaClienteInput').value;
        cargarClientesAdmin(q);
    }, 250);
}

function abrirModalNuevoCliente() {
    document.getElementById('crearClienteAlert').style.display = 'none';
    document.getElementById('formCrearCliente').reset();
    document.getElementById('modalNuevoCliente').classList.add('active');
}

function cerrarModalAdmin(id) {
    document.getElementById(id).classList.remove('active');
}

async function handleCrearCliente(e) {
    e.preventDefault();
    const alertBox = document.getElementById('crearClienteAlert');
    alertBox.style.display = 'none';

    const payload = {
        tipo_documento_id: document.getElementById('ncTipoDoc').value,
        numero_documento: document.getElementById('ncDocumento').value,
        nombres: document.getElementById('ncNombres').value,
        apellidos: document.getElementById('ncApellidos').value,
        correo: document.getElementById('ncCorreo').value,
        telefono: document.getElementById('ncTelefono').value,
        password: document.getElementById('ncPassword').value,
        pin_cajero: document.getElementById('ncPin').value,
        tipo_cuenta_id: document.getElementById('ncTipoCuenta').value,
        saldo_inicial: document.getElementById('ncSaldoInicial').value
    };

    try {
        const res = await fetch('/api/admin/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            alertBox.innerText = data.error || 'Error al crear cliente.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        alert('Cliente y cuenta bancaria creados con éxito. Número de cuenta asignado: ' + data.cliente.numero_cuenta);
        cerrarModalAdmin('modalNuevoCliente');
        cargarClientesAdmin();
        recargarDashboardAdmin();
    } catch (err) {
        alertBox.innerText = 'Error de conexión al registrar cliente.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

async function cambiarEstadoCliente(usuario_id, nuevo_estado_id) {
    const accion = nuevo_estado_id === 3 ? 'BLOQUEAR' : 'HABILITAR';
    if (!confirm(`¿Está seguro de que desea ${accion} este cliente y sus cuentas?`)) return;

    try {
        const res = await fetch('/api/admin/clientes/estado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id, nuevo_estado_id })
        });
        const data = await res.json();
        if (res.ok) {
            cargarClientesAdmin();
            recargarDashboardAdmin();
        } else {
            alert(data.error || 'Error al modificar estado.');
        }
    } catch (e) {
        alert('Error modificando estado del cliente.');
    }
}

async function handleConsignar(e) {
    e.preventDefault();
    const alertBox = document.getElementById('consignarAlert');
    alertBox.style.display = 'none';

    const numero_cuenta = document.getElementById('consignarCuenta').value;
    const valor = document.getElementById('consignarValor').value;
    const concepto = document.getElementById('consignarConcepto').value;

    const btn = document.getElementById('btnSubmitConsignar');
    btn.disabled = true;
    btn.innerText = 'Procesando consignación...';

    try {
        const res = await fetch('/api/admin/consignar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_cuenta, valor, concepto })
        });
        const data = await res.json();

        btn.disabled = false;
        btn.innerText = 'Aplicar Consignación en Caja →';

        if (!res.ok) {
            alertBox.innerText = data.error || 'Error al realizar consignación.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        // Mostrar comprobante
        document.getElementById('formConsignar').style.display = 'none';
        const r = data.recibo;
        document.getElementById('vcOp').innerText = '#' + r.transaccion_id;
        document.getElementById('vcFecha').innerText = formatDate(r.fecha);
        document.getElementById('vcCuenta').innerText = r.numero_cuenta;
        document.getElementById('vcTitular').innerText = r.titular;
        document.getElementById('vcMonto').innerText = '+' + formatCOP(r.valor_consignado);
        document.getElementById('vcSaldo').innerText = formatCOP(r.nuevo_saldo);
        document.getElementById('voucherConsignacion').style.display = 'block';

        recargarDashboardAdmin();

    } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Aplicar Consignación en Caja →';
        alertBox.innerText = 'Error de conexión procesando la consignación.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

function limpiarFormConsignacion() {
    document.getElementById('formConsignar').reset();
    document.getElementById('formConsignar').style.display = 'block';
    document.getElementById('voucherConsignacion').style.display = 'none';
    document.getElementById('consignarAlert').style.display = 'none';
}

async function cargarAuditoriaAdmin() {
    try {
        const res = await fetch('/api/admin/movimientos-general');
        const data = await res.json();
        const tbody = document.getElementById('tbodyAuditoriaAdmin');
        const movs = data.movimientos || [];

        if (movs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">Sin movimientos de auditoría registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = movs.map(m => {
            const esCredito = m.tipo_movimiento === 'CREDITO';
            return `
                <tr>
                    <td style="font-size:12px; white-space:nowrap;">${formatDate(m.fecha_hora)}</td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${m.numero_cuenta}</td>
                    <td>${m.nombres} ${m.apellidos}</td>
                    <td>
                        <strong>${m.descripcion}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${m.canal} — ${m.tipo_operacion}</div>
                    </td>
                    <td style="text-align:right;" class="${esCredito ? 'amount-credit' : 'amount-debit'}">
                        ${esCredito ? '+' : '-'}${formatCOP(m.valor)}
                    </td>
                    <td style="text-align:right; font-family:var(--font-mono); font-weight:700; color:var(--text-main);">
                        ${formatCOP(m.saldo_resultante)}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Error cargando auditoría:', e);
    }
}

async function logoutAdmin() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    currentAdmin = null;
    mostrarLoginAdmin();
}
