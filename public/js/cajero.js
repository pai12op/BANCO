// public/js/cajero.js - Lógica de Terminal de Cajero Automático (ATM)

let cuentaCajero = null;

document.addEventListener('DOMContentLoaded', () => {
    actualizarRelojAtm();
    setInterval(actualizarRelojAtm, 1000);
    verificarSesionCajero();
});

function actualizarRelojAtm() {
    const el = document.getElementById('atmClock');
    if (el) {
        const now = new Date();
        el.innerText = now.toLocaleDateString('es-CO') + ' ' + now.toLocaleTimeString('es-CO');
    }
}

function formatCOP(valor) {
    const num = parseFloat(valor) || 0;
    return '$' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' COP';
}

function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

// Soporte para PINPAD físico en pantalla
function teclearPin(digito) {
    const pinInput = document.getElementById('atmPin');
    if (pinInput && pinInput.value.length < 4) {
        pinInput.value += digito;
    }
}

function borrarPin() {
    const pinInput = document.getElementById('atmPin');
    if (pinInput) {
        pinInput.value = '';
    }
}

async function verificarSesionCajero() {
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.cajero) {
            cuentaCajero = data.cajero;
            mostrarMenuPrincipal();
        } else {
            mostrarPantallaLogin();
        }
    } catch (e) {
        mostrarPantallaLogin();
    }
}

function mostrarPantallaLogin() {
    document.getElementById('pantallaLoginAtm').style.display = 'block';
    document.getElementById('pantallaMenuAtm').style.display = 'none';
    document.getElementById('pantallaRetiroAtm').style.display = 'none';
    document.getElementById('pantallaResultadoAtm').style.display = 'none';
    document.getElementById('atmErrorBox').style.display = 'none';
}

function mostrarMenuPrincipal() {
    document.getElementById('pantallaLoginAtm').style.display = 'none';
    document.getElementById('pantallaMenuAtm').style.display = 'block';
    document.getElementById('pantallaRetiroAtm').style.display = 'none';
    document.getElementById('pantallaResultadoAtm').style.display = 'none';

    document.getElementById('atmTitular').innerText = cuentaCajero.titular;
    document.getElementById('atmCuentaNum').innerText = cuentaCajero.numero_cuenta;
}

async function iniciarSesionCajero() {
    const errorBox = document.getElementById('atmErrorBox');
    errorBox.style.display = 'none';

    const numero_cuenta = document.getElementById('atmNumeroCuenta').value;
    const pin = document.getElementById('atmPin').value;

    if (!numero_cuenta || !pin) {
        errorBox.innerText = 'Por favor ingrese número de cuenta y PIN.';
        errorBox.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('/api/auth/login-cajero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_cuenta, pin })
        });
        const data = await res.json();

        if (!res.ok) {
            errorBox.innerText = data.error || 'Operación rechazada por el banco.';
            errorBox.style.display = 'block';
            return;
        }

        cuentaCajero = data.cuenta;
        mostrarMenuPrincipal();
    } catch (err) {
        errorBox.innerText = 'Error de conexión con la red de cajeros.';
        errorBox.style.display = 'block';
    }
}

function mostrarRetiroRapido() {
    document.getElementById('pantallaMenuAtm').style.display = 'none';
    document.getElementById('pantallaRetiroAtm').style.display = 'block';
    document.getElementById('atmRetiroError').style.display = 'none';
}

function volverAlMenu() {
    mostrarMenuPrincipal();
}

async function procesarRetiro(valor) {
    const errorBox = document.getElementById('atmRetiroError');
    errorBox.style.display = 'none';

    try {
        const res = await fetch('/api/cajero/retirar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor })
        });
        const data = await res.json();

        if (!res.ok) {
            errorBox.innerText = data.error || 'Fondos insuficientes o error en retiro.';
            errorBox.style.display = 'block';
            return;
        }

        cuentaCajero.saldo = data.recibo.nuevo_saldo;

        // Mostrar Comprobante Térmico en pantalla ATM
        document.getElementById('pantallaRetiroAtm').style.display = 'none';
        document.getElementById('pantallaResultadoAtm').style.display = 'block';

        const r = data.recibo;
        document.getElementById('atmContenidoResultado').innerHTML = `
            <div class="atm-voucher">
                <div style="text-align:center; border-bottom:1px dashed #334155; padding-bottom:8px; margin-bottom:10px;">
                    <strong style="color:#0f172a; font-size:14px;">BANCO DIGITAL ANDINO</strong><br>
                    RED DE CAJEROS AUTOMÁTICOS ATM<br>
                    <span style="font-size:10px; color:#64748b;">DISPENSADOR EXITOSO</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Terminal:</span><span>${r.cajero_id}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Transacción:</span><strong>#${r.transaccion_id}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Fecha / Hora:</span><span>${formatDate(r.fecha)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Cuenta:</span><span>${r.numero_cuenta}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:6px; border-top:1px dashed #334155; font-size:14px; font-weight:700;">
                    <span>VALOR ENTREGADO:</span><span style="color:#b91c1c;">-${formatCOP(r.valor_retirado)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:13px; font-weight:700; color:#0f172a;">
                    <span>NUEVO SALDO:</span><span style="color:#15803d;">${formatCOP(r.nuevo_saldo)}</span>
                </div>
                <div style="text-align:center; margin-top:14px; font-size:10px; color:#64748b; border-top:1px dashed #334155; padding-top:6px;">
                    ¡POR FAVOR RETIRE SU DINERO Y SU COMPROBANTE!<br>
                    GRACIAS POR UTILIZAR NUESTROS SERVICIOS.
                </div>
            </div>
        `;
    } catch (err) {
        errorBox.innerText = 'Error de comunicación con el dispensador de efectivo.';
        errorBox.style.display = 'block';
    }
}

async function consultarSaldoAtm() {
    try {
        const res = await fetch('/api/cajero/saldo');
        const data = await res.json();

        if (!res.ok) {
            alert('Error consultando saldo.');
            return;
        }

        document.getElementById('pantallaMenuAtm').style.display = 'none';
        document.getElementById('pantallaResultadoAtm').style.display = 'block';

        document.getElementById('atmContenidoResultado').innerHTML = `
            <div style="text-align:center; padding:20px; background:#020617; border-radius:8px; border:1px solid #1e293b;">
                <h3 style="color:#94a3b8; font-size:13px; text-transform:uppercase; margin-bottom:10px;">Consulta de Saldo en Pantalla</h3>
                <div style="font-size:32px; font-weight:800; color:#22c55e; font-family:var(--font-mono); margin-bottom:14px;">
                    ${formatCOP(data.saldo)}
                </div>
                <div style="font-size:13px; color:#cbd5e1;">
                    Cuenta: <strong>${data.numero_cuenta}</strong> (${data.tipo_cuenta})<br>
                    Titular: <strong>${data.titular}</strong>
                </div>
            </div>
        `;
    } catch (e) {
        alert('Error al consultar saldo en cajero.');
    }
}

async function consultarMovimientosAtm() {
    try {
        const res = await fetch('/api/cajero/movimientos');
        const data = await res.json();

        document.getElementById('pantallaMenuAtm').style.display = 'none';
        document.getElementById('pantallaResultadoAtm').style.display = 'block';

        const movs = data.movimientos || [];
        const filas = movs.map(m => `
            <tr style="border-bottom:1px solid #1e293b; font-size:12px;">
                <td style="padding:6px 8px; color:#94a3b8;">${formatDate(m.fecha_hora)}</td>
                <td style="padding:6px 8px; color:#ffffff;">${m.descripcion}</td>
                <td style="padding:6px 8px; text-align:right; font-weight:700; color:${m.tipo_movimiento === 'CREDITO' ? '#22c55e' : '#ef4444'};">
                    ${m.tipo_movimiento === 'CREDITO' ? '+' : '-'}${formatCOP(m.valor)}
                </td>
            </tr>
        `).join('');

        document.getElementById('atmContenidoResultado').innerHTML = `
            <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:16px;">
                <h3 style="color:#ffffff; font-size:14px; margin-bottom:10px; text-align:center;">Últimos Movimientos Registrados</h3>
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid #334155; font-size:11px; color:#94a3b8; text-transform:uppercase;">
                            <th style="text-align:left; padding:6px 8px;">Fecha</th>
                            <th style="text-align:left; padding:6px 8px;">Concepto</th>
                            <th style="text-align:right; padding:6px 8px;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>${filas || '<tr><td colspan="3" style="text-align:center; padding:15px; color:#64748b;">Sin movimientos recientes.</td></tr>'}</tbody>
                </table>
            </div>
        `;
    } catch (e) {
        alert('Error consultando movimientos.');
    }
}

async function salirCajero() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    cuentaCajero = null;
    document.getElementById('atmPin').value = '';
    mostrarPantallaLogin();
}
