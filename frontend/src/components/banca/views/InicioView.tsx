import { useState } from "react";
import {
  Send, Receipt, Plus, CreditCard, ArrowDownLeft,
  ArrowUpRight, Search, Wallet, FileText, ShieldCheck,
  ChevronRight, Copy, Check, Eye, EyeOff, ChevronDown, ChevronUp,
  Store, Heart, Edit3, Radio, Sparkles, Landmark
} from "lucide-react";
import { toast } from "sonner";
import { Cuenta, Movimiento, Usuario } from "../types";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface InicioViewProps {
  usuario: Usuario | null;
  cuentas: Cuenta[];
  cuentaActiva: Cuenta | null;
  saldoReal: number;
  movimientosFiltrados: Movimiento[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenTransferir: () => void;
  onOpenCuentas: () => void;
  onOpenAjustes: () => void;
  onOpenTarjetas: () => void;
  onRefreshMovimientos: () => void;
  onSelectCuenta: (cuenta: Cuenta) => void;
}

export function InicioView({
  usuario,
  cuentas,
  cuentaActiva,
  saldoReal,
  movimientosFiltrados,
  searchTerm,
  onSearchChange,
  onOpenTransferir,
  onOpenCuentas,
  onOpenAjustes,
  onOpenTarjetas,
  onRefreshMovimientos,
  onSelectCuenta,
}: InicioViewProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [saldoVisible, setSaldoVisible] = useState(true);
  const [tuPlataAbierto, setTuPlataAbierto] = useState(false);
  const bars = [42, 65, 38, 80, 55, 72, 90, 48, 60, 76, 52, 68];
  const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  // Cuentas reales conectadas a MySQL
  const cuentasAMostrar = cuentas && cuentas.length > 0
    ? cuentas
    : (cuentaActiva ? [cuentaActiva] : []);

  // Saldo total real sumando las cuentas del cliente
  const totalDisponible = cuentasAMostrar.reduce(
    (acc, c) => acc + (parseFloat(c.saldo as any) || 0),
    0
  );

  // Total de ingresos (créditos)
  const totalIngresos = movimientosFiltrados
    .filter((m) => m.sentido === "CREDITO" || m.tipo_movimiento === "CREDITO")
    .reduce((acc, m) => acc + (parseFloat(m.valor as any) || 0), 0);

  // Total de gastos reales (débitos)
  const totalGastos = movimientosFiltrados
    .filter((m) => m.sentido === "DEBITO" || m.tipo_movimiento === "DEBITO")
    .reduce((acc, m) => acc + (parseFloat(m.valor as any) || 0), 0);

  const handleCopyAccount = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAccount(true);
    toast.success("Número de cuenta copiado al portapapeles.");
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* SECCIÓN HERO NEQUI EN MODO OBSIDIANA (IMAGEN 1)          */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-[#1a2d4e] bg-gradient-to-b from-[#0e1d3a] via-[#091326] to-[#060b14] p-5 sm:p-7 text-center shadow-2xl space-y-3">
        {/* CUENTA Y OJO PARA OCULTAR SALDO */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium">
          <span>{cuentasAMostrar[0]?.tipo_cuenta || "Cuenta de Ahorros"}</span>
          <button
            onClick={() => setSaldoVisible(!saldoVisible)}
            className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
            title={saldoVisible ? "Ocultar saldo" : "Mostrar saldo"}
          >
            {saldoVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {/* MONTO GIGANTE CENTRAL */}
        <div className="py-1">
          <p className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {saldoVisible ? fmt(totalDisponible) : "$ ••••••"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total {saldoVisible ? fmt(totalDisponible) : "$ ••••••"}
          </p>
        </div>

        {/* BOTÓN DESPLEGABLE "TU PLATA ∨" */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setTuPlataAbierto(!tuPlataAbierto)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            <span>Tu plata</span>
            <ChevronDown className={`h-3.5 w-3.5 text-cyan-400 transition-transform duration-200 ${tuPlataAbierto ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* DESGLOSE DESPLEGABLE DE SALDOS */}
        {tuPlataAbierto && (
          <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-[#081222] p-4 text-xs text-left space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Saldo Disponible:</span>
              <span className="font-mono font-bold text-emerald-400">{fmt(totalDisponible)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">En bolsillos de ahorro:</span>
              <span className="font-mono font-semibold text-slate-400">$ 0 COP</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-400">Tarjeta Débito Vinculada:</span>
              <span className="font-mono font-bold text-cyan-300">
                {cuentaActiva ? `${cuentaActiva.numero_cuenta.slice(0, 4)} •••• ${cuentaActiva.numero_cuenta.slice(-4)}` : "4001 •••• 1053"}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* CARRUSEL DE BANNERS "ORGANIZA TU PLATA" (IMAGEN 1)       */}
      {/* ======================================================== */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {/* CARD 1: Organiza tu plata */}
        <div className="min-w-[270px] sm:min-w-[310px] snap-center rounded-2xl border border-[#1b2b4a] bg-gradient-to-r from-[#0d1c3a] to-[#071124] p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1 pr-2">
            <p className="font-display font-bold text-sm text-white">Organiza tu plata</p>
            <p className="text-[11px] text-slate-400 leading-snug">Separa tus gastos y ahorra con metas</p>
            <button
              onClick={onOpenAjustes}
              className="mt-2.5 inline-block rounded-xl bg-cyan-500 hover:bg-cyan-400 px-3.5 py-1.5 text-[11px] font-bold text-slate-950 transition-colors shadow-md shadow-cyan-500/20"
            >
              Hazlo aquí
            </button>
          </div>
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        {/* CARD 2: Tarjeta Débito Digital */}
        <div className="min-w-[270px] sm:min-w-[310px] snap-center rounded-2xl border border-[#1b2b4a] bg-gradient-to-r from-[#0d1c3a] to-[#071124] p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1 pr-2">
            <p className="font-display font-bold text-sm text-white">Tarjeta Débito Digital</p>
            <p className="text-[11px] text-slate-400 leading-snug">Paga en datáfono y compras en línea</p>
            <button
              onClick={onOpenTarjetas}
              className="mt-2.5 inline-block rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors shadow-md shadow-blue-600/20"
            >
              Ver tarjeta
            </button>
          </div>
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* CARD 3: Domicilios Llorente */}
        <div className="min-w-[270px] sm:min-w-[310px] snap-center rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#1c1808] to-[#0b0c16] p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1 pr-2">
            <p className="font-display font-bold text-sm text-amber-300">🛵 Domicilios Llorente</p>
            <p className="text-[11px] text-slate-400 leading-snug">Prueba el pago en datáfono contactless</p>
            <button
              onClick={onOpenTarjetas}
              className="mt-2.5 inline-block rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-[11px] font-bold text-slate-950 transition-colors shadow-md shadow-amber-500/20"
            >
              Pagar $35.000
            </button>
          </div>
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Store className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN SUGERIDOS (IMAGEN 1)                             */}
      {/* ======================================================== */}
      <div className="space-y-2.5">
        <h3 className="font-display text-sm font-bold text-slate-200">Sugeridos</h3>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Envía plata", icon: Send, action: onOpenTransferir, color: "text-[#38bdf8]" },
            { label: "Datáfono POS", icon: Radio, action: onOpenTarjetas, color: "text-cyan-400" },
            { label: "Cajero ATM", icon: Landmark, action: () => { window.location.href = "/cajero"; }, color: "text-emerald-400" },
            { label: "Mis Cuentas", icon: Wallet, action: onOpenCuentas, color: "text-indigo-400" },
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={s.action}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#162544] bg-[#091122] hover:bg-[#0e1c36] p-3 text-center transition-all group shadow-sm active:scale-95"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#111e38] group-hover:scale-105 transition-transform">
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-300 leading-tight truncate w-full">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN TUS FAVORITOS (IMAGEN 1)                         */}
      {/* ======================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-rose-400" /> Tus favoritos
          </h3>
          <button
            onClick={onOpenTarjetas}
            className="text-slate-400 hover:text-white p-1"
            title="Editar favoritos"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {[
            { name: "Domicilios Llorente", emoji: "🛵", tag: "Llorente" },
            { name: "Juan Valdez Café", emoji: "☕", tag: "Café" },
            { name: "Éxito Manizales", emoji: "🛒", tag: "Éxito" },
            { name: "Cine Colombia", emoji: "🎬", tag: "Cine" },
          ].map((fav, i) => (
            <button
              key={i}
              onClick={onOpenTarjetas}
              className="flex flex-col items-center gap-1 rounded-2xl border border-[#162544] bg-[#091122] hover:bg-[#0e1c36] p-2.5 min-w-[76px] text-center shrink-0 active:scale-95 transition-all shadow-sm"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#12203a] text-xl shadow-inner">
                <span>{fav.emoji}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-300 truncate w-16">{fav.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: 2 COLUMNAS ARMONIZADAS */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA: CUENTAS + ÚLTIMOS MOVIMIENTOS        */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* CUENTAS REGISTRADAS */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#0e76fd]" />
                <span>Tus Cuentas Bancarias</span>
              </h2>
              <button
                onClick={onOpenCuentas}
                className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] bg-[#0e76fd]/10 px-2.5 py-1 rounded-lg border border-[#0e76fd]/20 transition-colors"
              >
                Administrar
              </button>
            </div>

            {/* SI HAY 1 CUENTA (CASO FRECUENTE): BANNER COMPLETO ELEGANTE */}
            {cuentasAMostrar.length === 1 ? (
              <div
                onClick={() => onSelectCuenta(cuentasAMostrar[0])}
                className="rounded-2xl border border-[#1a2d4f] bg-gradient-to-r from-[#091120] to-[#0c172c] p-5 shadow-lg ring-1 ring-[#0e76fd]/30 transition-all hover:border-[#0e76fd]/60 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-200">
                        {cuentasAMostrar[0].tipo_cuenta || "Cuenta de Ahorros"}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        ● ACTIVA
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span>Cuenta No. {cuentasAMostrar[0].numero_cuenta}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(cuentasAMostrar[0].numero_cuenta);
                        }}
                        className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copiar número"
                      >
                        {copiedAccount ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Saldo Disponible</p>
                    <p className="font-display text-2xl font-bold text-white tracking-tight">
                      {fmt(parseFloat(cuentasAMostrar[0].saldo as any) || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* SI HAY 2 O MÁS CUENTAS: GRID */
              <div className="grid gap-3 sm:grid-cols-2">
                {cuentasAMostrar.map((c) => {
                  const isActive = cuentaActiva?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectCuenta(c)}
                      className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all ${
                        isActive
                          ? "border-[#1a2d4f] bg-[#091120] shadow-lg ring-1 ring-[#0e76fd]/30"
                          : "border-[#141d2f] bg-[#080d19] hover:border-[#1a2d4f]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{c.tipo_cuenta || "Cuenta de Ahorros"}</span>
                        <span className="font-mono text-slate-400">•••• {c.numero_cuenta ? c.numero_cuenta.slice(-4) : "0000"}</span>
                      </div>
                      <div className="my-2">
                        <p className="font-display text-xl font-bold text-white tracking-tight">
                          {fmt(parseFloat(c.saldo as any) || 0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Disponible hoy</span>
                        {isActive && <span className="text-emerald-400 font-semibold">● Seleccionada</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ÚLTIMOS MOVIMIENTOS */}
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Últimos movimientos
                </h2>
                <p className="text-[11px] text-slate-400">
                  Actividad en tiempo real de tu cuenta
                </p>
              </div>
              <button
                onClick={onOpenCuentas}
                className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] transition-colors"
              >
                Ver extracto completo
              </button>
            </div>

            <div className="divide-y divide-[#131b2c]">
              {movimientosFiltrados.length > 0 ? (
                movimientosFiltrados.slice(0, 5).map((m) => {
                  const esIngreso = m.sentido === "CREDITO" || m.tipo_movimiento === "CREDITO";
                  return (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                            esIngreso
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-[#111929] text-slate-400"
                          }`}
                        >
                          {esIngreso ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {m.descripcion || m.tipo_operacion}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {m.tipo_operacion} ·{" "}
                            {new Date(m.fecha_hora).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right pl-3">
                        <p
                          className={`font-mono text-sm font-bold ${
                            esIngreso ? "text-emerald-400" : "text-slate-200"
                          }`}
                        >
                          {esIngreso ? `+${fmt(m.valor)}` : `-${fmt(m.valor)}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No hay movimientos registrados en esta cuenta.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA: RESUMEN DE GASTOS + ACCESOS RÁPIDOS    */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* ANÁLISIS DE INGRESOS Y GASTOS */}
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Resumen Mensual</h2>
                <p className="text-xs text-slate-400">Flujo de efectivo · Noviembre 2026</p>
              </div>
              <span className="rounded-xl bg-[#111b2c] px-2.5 py-1 text-xs font-semibold text-slate-300 border border-[#1b2a45]">
                Mes Actual
              </span>
            </div>

            {/* TARJETAS DE MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#091120] border border-[#162238] p-3 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ArrowDownLeft className="h-3 w-3 text-emerald-400" /> Ingresos
                </span>
                <p className="font-mono text-base font-bold text-emerald-400">
                  {fmt(totalIngresos)}
                </p>
              </div>
              <div className="rounded-xl bg-[#091120] border border-[#162238] p-3 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-rose-400" /> Gastos
                </span>
                <p className="font-mono text-base font-bold text-slate-200">
                  {fmt(totalGastos)}
                </p>
              </div>
            </div>

            {/* BARRAS MENSUALES */}
            <div className="flex h-36 items-end justify-between gap-1.5 pt-2">
              {bars.map((h, i) => {
                const isCurrentMonth = i === 10;
                const barHeight = isCurrentMonth ? Math.max(35, Math.min(100, (totalIngresos / 200000) * 80)) : h;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        isCurrentMonth
                          ? "bg-[#00d2ff] shadow-lg shadow-cyan-500/40"
                          : "bg-[#12427a]/60 hover:bg-[#1a559d]"
                      }`}
                    />
                    <span className="font-mono text-[10px] text-slate-400">
                      {months[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ACCESOS RÁPIDOS Y SERVICIOS */}
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-5 shadow-sm space-y-3">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Servicios & Certificaciones
            </h3>

            <div className="space-y-2">
              <button
                onClick={onOpenCuentas}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#091120] border border-[#162238] hover:border-[#0e76fd]/50 transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 group-hover:text-primary transition-colors">
                      Certificado Bancario
                    </p>
                    <p className="text-[10px] text-slate-400">Descargar carta oficial de tu cuenta</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={onOpenTarjetas}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#091120] border border-[#162238] hover:border-[#0e76fd]/50 transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                      Tarjeta & PIN Cajero
                    </p>
                    <p className="text-[10px] text-slate-400">Ver datos seguros, CVV o compras POS</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={onOpenAjustes}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#091120] border border-[#162238] hover:border-[#0e76fd]/50 transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      Seguridad y Perfil
                    </p>
                    <p className="text-[10px] text-slate-400">Actualizar teléfono o cambiar contraseña</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
