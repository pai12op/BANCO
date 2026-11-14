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
  onOpenSacarPlata: () => void;
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
  onOpenSacarPlata,
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
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* ======================================================== */}
      {/* SECCIÓN HERO SALDO OBSIDIANA LIMPIO Y ORDENADO           */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#1a2d4e] bg-gradient-to-b from-[#0e1d3a] via-[#091326] to-[#060b14] p-4 sm:p-6 text-center shadow-xl space-y-3 sm:space-y-4">
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
        <div className="py-0.5">
          <p className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {saldoVisible ? fmt(totalDisponible) : "$ ••••••"}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Total {saldoVisible ? fmt(totalDisponible) : "$ ••••••"}
          </p>
        </div>

        {/* BOTÓN DESPLEGABLE "TU PLATA ∨" */}
        <div className="flex justify-center pt-0.5">
          <button
            onClick={() => setTuPlataAbierto(!tuPlataAbierto)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-3.5 py-1 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            <span>Tu plata</span>
            <ChevronDown className={`h-3.5 w-3.5 text-cyan-400 transition-transform duration-200 ${tuPlataAbierto ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* DESGLOSE DESPLEGABLE DE SALDOS */}
        {tuPlataAbierto && (
          <div className="mt-2.5 rounded-xl border border-cyan-500/20 bg-[#081222] p-3.5 text-xs text-left space-y-2 animate-in fade-in zoom-in-95 duration-150">
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

        {/* LOS 3 BOTONES DE ACCIÓN RÁPIDA PRINCIPALES EN MODO MÓVIL APILADO (NATIVE MOBILE FEEL) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={onOpenTransferir}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#0f1d38]/90 border border-[#1f3763] hover:bg-[#152a52] active:scale-95 py-2.5 px-1.5 text-center transition-all shadow-sm group"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-[#38bdf8] group-hover:scale-105 transition-transform">
              <Send className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-white">Transferir</span>
          </button>

          <button
            onClick={onOpenTarjetas}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#0f1d38]/90 border border-[#1f3763] hover:bg-[#152a52] active:scale-95 py-2.5 px-1.5 text-center transition-all shadow-sm group"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400 group-hover:scale-105 transition-transform">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-white">Datáfono</span>
          </button>

          <button
            onClick={onOpenSacarPlata}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/40 active:scale-95 py-2.5 px-1.5 text-center transition-all shadow-sm group"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:scale-105 transition-transform">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-cyan-200">Sacar plata</span>
          </button>
        </div>
      </section>

      {/* CARD TARJETA DÉBITO DIGITAL DESTACADA (RESPONSIVE SEGURO) */}
      <section
        onClick={onOpenTarjetas}
        className="cursor-pointer flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#182845] bg-gradient-to-r from-[#091224] to-[#0d1c3a] p-4 sm:p-5 shadow-xl hover:border-[#0e76fd]/50 transition-all active:scale-[0.99] group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" /> Tarjeta Débito Digital
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
            ● ACTIVA
          </span>
        </div>

        <div className="my-2.5 flex items-center justify-between gap-2 min-w-0">
          <p className="font-mono text-base sm:text-xl font-bold tracking-wider text-white truncate">
            {cuentaActiva
              ? `${cuentaActiva.numero_cuenta.slice(0, 4)} •••• •••• ${cuentaActiva.numero_cuenta.slice(-4)}`
              : "4001 •••• •••• 1053"}
          </p>
          <span className="text-xs text-cyan-400 font-semibold shrink-0 group-hover:underline">
            Gestionar →
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
          <div className="min-w-0 pr-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Titular</span>
            <span className="font-semibold text-slate-200 truncate block text-xs">
              {usuario ? `${usuario.nombres} ${usuario.apellidos}`.toUpperCase() : "TITULAR"}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Saldo en Tarjeta</span>
            <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">{fmt(saldoReal)}</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN PRINCIPAL: 2 COLUMNAS ARMONIZADAS */}
      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA: CUENTAS + ÚLTIMOS MOVIMIENTOS        */}
        {/* ======================================================== */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* CUENTAS REGISTRADAS */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#0e76fd]" />
                <span>Tus Cuentas Bancarias</span>
              </h2>
              <button
                onClick={onOpenCuentas}
                className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] bg-[#0e76fd]/10 px-2.5 py-1 rounded-lg border border-[#0e76fd]/20 transition-colors shrink-0"
              >
                Administrar
              </button>
            </div>

            {/* SI HAY 1 CUENTA (CASO FRECUENTE): BANNER COMPLETO ELEGANTE */}
            {cuentasAMostrar.length === 1 ? (
              <div
                onClick={() => onSelectCuenta(cuentasAMostrar[0])}
                className="rounded-2xl border border-[#1a2d4f] bg-gradient-to-r from-[#091120] to-[#0c172c] p-4 sm:p-5 shadow-lg ring-1 ring-[#0e76fd]/30 transition-all hover:border-[#0e76fd]/60 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-200 truncate">
                        {cuentasAMostrar[0].tipo_cuenta || "Cuenta de Ahorros"}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
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

                  <div className="text-left sm:text-right pt-1 sm:pt-0 shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Saldo Disponible</p>
                    <p className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
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
                      className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 sm:p-4 transition-all ${
                        isActive
                          ? "border-[#1a2d4f] bg-[#091120] shadow-lg ring-1 ring-[#0e76fd]/30"
                          : "border-[#141d2f] bg-[#080d19] hover:border-[#1a2d4f]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300 truncate">{c.tipo_cuenta || "Cuenta de Ahorros"}</span>
                        <span className="font-mono text-slate-400 shrink-0">•••• {c.numero_cuenta ? c.numero_cuenta.slice(-4) : "0000"}</span>
                      </div>
                      <div className="my-1.5">
                        <p className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
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
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Últimos movimientos
                </h2>
                <p className="text-[11px] text-slate-400">
                  Actividad en tiempo real de tu cuenta
                </p>
              </div>
              <button
                onClick={onOpenCuentas}
                className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] transition-colors shrink-0"
              >
                Ver extracto completo
              </button>
            </div>

            <div className="divide-y divide-slate-800/40">
              {movimientosFiltrados.length > 0 ? (
                movimientosFiltrados.slice(0, 5).map((m) => {
                  const esIngreso = m.sentido === "CREDITO" || m.tipo_movimiento === "CREDITO";
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2.5 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-medium text-slate-100">
                            {m.descripcion || m.tipo_operacion}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
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

                      <div className="text-right pl-2 shrink-0">
                        <p
                          className={`font-mono text-xs sm:text-sm font-bold ${
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
                <div className="py-6 text-center text-slate-500 text-xs">
                  No hay movimientos registrados en esta cuenta.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA: RESUMEN DE GASTOS + ACCESOS RÁPIDOS    */}
        {/* ======================================================== */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* ANÁLISIS DE INGRESOS Y GASTOS (COMPACTO Y ELEGANTE) */}
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white">Resumen Mensual</h2>
                <p className="text-[11px] text-slate-400">Flujo de efectivo · Noviembre 2026</p>
              </div>
              <span className="rounded-lg bg-[#111b2c] px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-[#1b2a45]">
                Mes Actual
              </span>
            </div>

            {/* TARJETAS DE MÉTRICAS */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-[#091120] border border-[#162238] p-3 space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <ArrowDownLeft className="h-3 w-3 text-emerald-400" /> Ingresos
                </span>
                <p className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                  {fmt(totalIngresos)}
                </p>
              </div>
              <div className="rounded-xl bg-[#091120] border border-[#162238] p-3 space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="h-3 w-3 text-rose-400" /> Gastos
                </span>
                <p className="font-mono text-sm sm:text-base font-bold text-slate-200">
                  {fmt(totalGastos)}
                </p>
              </div>
            </div>

            {/* BARRA DE PROPORCIÓN VISUAL SIN ESPACIOS NULOS */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Balance neto disponible</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{fmt(Math.max(0, totalIngresos - totalGastos))}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, Math.max(10, (totalIngresos / (totalIngresos + totalGastos || 1)) * 100))}%` }}
                  className="bg-emerald-400 h-full transition-all"
                  title="Ingresos"
                />
                <div
                  style={{ width: `${Math.min(100, Math.max(10, (totalGastos / (totalIngresos + totalGastos || 1)) * 100))}%` }}
                  className="bg-rose-500/70 h-full transition-all"
                  title="Gastos"
                />
              </div>
            </div>
          </section>

          {/* ACCESOS RÁPIDOS Y SERVICIOS INTEGRADOS */}
          <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-4 sm:p-5 shadow-sm space-y-2.5">
            <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">
              Servicios & Certificaciones
            </h3>

            <div className="divide-y divide-slate-800/60 rounded-xl border border-[#162238] bg-[#091120] overflow-hidden">
              <button
                onClick={onOpenCuentas}
                className="w-full flex items-center justify-between p-3 hover:bg-[#0e1b33] transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 group-hover:text-primary transition-colors text-xs truncate">
                      Certificado Bancario
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">Descargar carta oficial de tu cuenta</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={onOpenTarjetas}
                className="w-full flex items-center justify-between p-3 hover:bg-[#0e1b33] transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors text-xs truncate">
                      Tarjeta & PIN Cajero
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">Ver datos seguros, CVV o compras POS</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={onOpenAjustes}
                className="w-full flex items-center justify-between p-3 hover:bg-[#0e1b33] transition-all text-xs group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors text-xs truncate">
                      Seguridad y Perfil
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">Actualizar teléfono o cambiar contraseña</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0 group-hover:text-white transition-colors" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
