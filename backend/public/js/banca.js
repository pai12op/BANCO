// public/js/banca.js - Lógica de Cliente Banca Virtual

let currentUsuario = null;
let currentCuentas = [];

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionBanca();
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

async function verificarSesionBanca() {
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.usuario && data.usuario.rol_id === 2) {
            currentUsuario = data.usuario;
            mostrarDashboard();
            await recargarDatosBanca();
        } else {
            mostrarLogin();
        }
    } catch (e) {
        mostrarLogin();
    }
}

function mostrarLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('topbarUserNav').style.display = 'none';
}

function mostrarDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('topbarUserNav').style.display = 'flex';
}

async function handleLoginBanca(e) {
    e.preventDefault();
    const alertBox = document.getElementById('loginAlert');
    alertBox.style.display = 'none';

    const identificador = document.getElementById('loginIdentificador').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador, password })
        });
        const data = await res.json();

        if (!res.ok) {
            alertBox.innerText = data.error || 'Error al iniciar sesión.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        currentUsuario = data.usuario;
        currentCuentas = data.cuentas;
        mostrarDashboard();
        await recargarDatosBanca();
    } catch (err) {
        alertBox.innerText = 'Error de conexión con el servidor bancario.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

async function recargarDatosBanca() {
    try {
        // 1. Cargar resumen de cuenta y cliente
        const resResumen = await fetch('/api/banca/resumen');
        if (!resResumen.ok) return logoutBanca();
        const dataResumen = await resResumen.json();

        const usuario = dataResumen.usuario;
        currentCuentas = dataResumen.cuentas;
        const cuentaPrincipal = currentCuentas[0];

        // Topbar
        document.getElementById('userNameNav').innerText = `${usuario.nombres} ${usuario.apellidos}`;
        document.getElementById('userDocNav').innerText = `${usuario.tipo_documento} ${usuario.numero_documento}`;

        // Tarjeta
        if (cuentaPrincipal) {
            document.getElementById('accountNumberCard').innerText = cuentaPrincipal.numero_cuenta.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
            document.getElementById('accountBalanceCard').innerText = formatCOP(cuentaPrincipal.saldo);
            document.getElementById('accountHolderCard').innerText = `${usuario.nombres} ${usuario.apellidos}`;
            document.getElementById('accountTypeCard').innerText = cuentaPrincipal.tipo_cuenta;
            document.getElementById('accountBadge').innerText = cuentaPrincipal.estado_cuenta;
            document.getElementById('accountBadge').className = cuentaPrincipal.estado_cuenta === 'ACTIVA' ? 'badge badge-success' : 'badge badge-danger';
        }

        // Modal perfil
        document.getElementById('perfilTelefono').value = usuario.telefono || '';

        // 2. Cargar movimientos
        if (cuentaPrincipal) {
            const resMov = await fetch(`/api/banca/movimientos?cuenta_id=${cuentaPrincipal.id}`);
            const dataMov = await resMov.json();
            renderMovimientos(dataMov.movimientos || []);
        }

    } catch (e) {
        console.error('Error recargando datos:', e);
    }
}

function renderMovimientos(movs) {
    const tbody = document.getElementById('movimientosBody');
    const badge = document.getElementById('movimientosCountBadge');
    badge.innerText = `${movs.length} operaciones`;

    if (movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No hay movimientos registrados en esta cuenta.</td></tr>`;
        return;
    }

    tbody.innerHTML = movs.map(m => {
        const esCredito = m.tipo_movimiento === 'CREDITO';
        const signo = esCredito ? '+' : '-';
        const claseMonto = esCredito ? 'amount-credit' : 'amount-debit';
        return `
            <tr>
                <td style="font-size:12px; white-space:nowrap;">${formatDate(m.fecha_hora)}</td>
                <td>
                    <strong>${m.descripcion}</strong>
                    <div style="font-size:11px; color:var(--text-muted);">${m.tipo_operacion}</div>
                </td>
                <td><span class="badge badge-primary">${m.canal}</span></td>
                <td style="text-align:right;" class="${claseMonto}">${signo}${formatCOP(m.valor)}</td>
                <td style="text-align:right; font-family:var(--font-mono); color:var(--text-muted);">${formatCOP(m.saldo_resultante)}</td>
            </tr>
        `;
    }).join('');
}

function abrirModalTransferencia() {
    const select = document.getElementById('transferCuentaOrigen');
    select.innerHTML = currentCuentas.map(c => `
        <option value="${c.id}">${c.tipo_cuenta} - No. ${c.numero_cuenta} (Saldo: ${formatCOP(c.saldo)})</option>
    `).join('');

    document.getElementById('formTransferir').style.display = 'block';
    document.getElementById('voucherTransferencia').style.display = 'none';
    document.getElementById('transferAlert').style.display = 'none';

    document.getElementById('modalTransferencia').classList.add('active');
}

async function handleTransferir(e) {
    e.preventDefault();
    const alertBox = document.getElementById('transferAlert');
    alertBox.style.display = 'none';

    const cuenta_origen_id = document.getElementById('transferCuentaOrigen').value;
    const numero_cuenta_destino = document.getElementById('transferCuentaDestino').value;
    const valor = document.getElementById('transferValor').value;
    const concepto = document.getElementById('transferConcepto').value;

    const btn = document.getElementById('btnSubmitTransfer');
    btn.disabled = true;
    btn.innerText = 'Procesando...';

    try {
        const res = await fetch('/api/banca/transferir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cuenta_origen_id, numero_cuenta_destino, valor, concepto })
        });
        const data = await res.json();

        btn.disabled = false;
        btn.innerText = 'Confirmar Transferencia';

        if (!res.ok) {
            alertBox.innerText = data.error || 'Error al realizar transferencia.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        // Mostrar Comprobante
        document.getElementById('formTransferir').style.display = 'none';
        const v = data.comprobante;
        document.getElementById('vOp').innerText = '#' + v.numero_operacion;
        document.getElementById('vFecha').innerText = formatDate(v.fecha);
        document.getElementById('vOrigen').innerText = v.cuenta_origen;
        document.getElementById('vDestino').innerText = v.cuenta_destino;
        document.getElementById('vTitular').innerText = v.titular_destino;
        document.getElementById('vMonto').innerText = '-' + formatCOP(v.valor);
        document.getElementById('vSaldo').innerText = formatCOP(v.nuevo_saldo);
        document.getElementById('voucherTransferencia').style.display = 'block';

        // Recargar datos en segundo plano
        recargarDatosBanca();

    } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Confirmar Transferencia';
        alertBox.innerText = 'Error de conexión procesando la transferencia.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

function abrirModalPerfil() {
    document.getElementById('perfilAlert').style.display = 'none';
    document.getElementById('modalPerfil').classList.add('active');
}

async function handleActualizarPerfil(e) {
    e.preventDefault();
    const alertBox = document.getElementById('perfilAlert');
    alertBox.style.display = 'none';

    const telefono = document.getElementById('perfilTelefono').value;
    try {
        const res = await fetch('/api/banca/perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono })
        });
        const data = await res.json();
        alertBox.innerText = data.mensaje || 'Perfil actualizado.';
        alertBox.className = 'badge-success';
        alertBox.style.display = 'block';
    } catch (err) {
        alertBox.innerText = 'Error al actualizar perfil.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

async function handleCambiarClave(e) {
    e.preventDefault();
    const alertBox = document.getElementById('perfilAlert');
    alertBox.style.display = 'none';

    const password_actual = document.getElementById('claveActual').value;
    const password_nuevo = document.getElementById('claveNueva').value;

    try {
        const res = await fetch('/api/banca/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password_actual, password_nuevo })
        });
        const data = await res.json();
        if (!res.ok) {
            alertBox.innerText = data.error || 'Error al cambiar clave.';
            alertBox.className = 'badge-danger';
            alertBox.style.display = 'block';
            return;
        }

        alertBox.innerText = data.mensaje || 'Contraseña actualizada.';
        alertBox.className = 'badge-success';
        alertBox.style.display = 'block';
        document.getElementById('formClave').reset();
    } catch (err) {
        alertBox.innerText = 'Error al cambiar contraseña.';
        alertBox.className = 'badge-danger';
        alertBox.style.display = 'block';
    }
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
}

async function logoutBanca() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    currentUsuario = null;
    mostrarLogin();
}
