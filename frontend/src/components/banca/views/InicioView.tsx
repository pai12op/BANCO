import { useState } from "react";
import {
  Send, Receipt, Plus, CreditCard, ArrowDownLeft,
  ArrowUpRight, RefreshCw, Search
} from "lucide-react";
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

  // Total de gastos reales (débitos)
  const totalGastos = movimientosFiltrados
    .filter((m) => m.sentido === "DEBITO" || m.tipo_movimiento === "DEBITO")
    .reduce((acc, m) => acc + (parseFloat(m.valor as any) || 0), 0);

  return (
    <div className="space-y-6">
      {/* BARRA DE BÚSQUEDA SUPERIOR FIEL A LA MAQUETA */}
      <div className="relative flex items-center rounded-xl border border-[#172236] bg-[#09101c] px-4 py-2.5 shadow-inner transition-colors focus-within:border-[#0e76fd]">
        <Search className="h-4 w-4 mr-3 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar movimientos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        />
      </div>

      {/* FILA 1: SALDO TOTAL DISPONIBLE Y TARJETA DÉBITO VINCULADA */}
      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* CARD HERO SALDO */}
        <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[#1371ff]/30 bg-gradient-to-br from-[#0c2445] via-[#09152a] to-[#060a14] p-6 shadow-2xl">
          <div className="relative w-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  SALDO TOTAL DISPONIBLE
                </p>
                <p className="mt-2 truncate font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {fmt(totalDisponible)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                ● Al día
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {cuentasAMostrar.length} {cuentasAMostrar.length === 1 ? "cuenta activa" : "cuentas activas"} · saldo en línea
            </p>

            {/* BOTONES DE ACCIÓN RÁPIDA */}
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <button
                onClick={onOpenTransferir}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
              >
                <Send className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>Transferir</span>
              </button>

              <button
                onClick={onOpenTransferir}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
              >
                <Receipt className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>Pagar</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = "/cajero";
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>Cajero ATM</span>
              </button>
            </div>
          </div>
        </section>

        {/* CARD TARJETA DÉBITO VINCULADA */}
        <section
          onClick={onOpenTarjetas}
          className="cursor-pointer flex flex-col justify-between rounded-2xl border border-[#162339] bg-[#080e1b] p-6 shadow-xl transition-all hover:border-[#0e76fd]/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#00d2ff] flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Tarjeta Débito Digital
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              ● ACTIVA
            </span>
          </div>

          <div className="my-4">
            <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#00d2ff]">
              {cuentaActiva
                ? `${cuentaActiva.numero_cuenta.slice(0, 4)} •••• •••• ${cuentaActiva.numero_cuenta.slice(-4)}`
                : "4001 •••• •••• 1053"}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Titular</p>
                <p className="font-semibold text-slate-200">
                  {usuario ? `${usuario.nombres} ${usuario.apellidos}`.toUpperCase() : "ANDRÉS PAI"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-500">Vence</p>
                <p className="font-mono text-slate-200">12/30</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Saldo Disponible:</span>
              <span className="font-mono font-bold text-emerald-400">{fmt(saldoReal)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* FILA 2: TUS CUENTAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-white">
            Tus cuentas
          </h2>
          <button
            onClick={onOpenCuentas}
            className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] transition-colors"
          >
            Ver todas
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cuentasAMostrar.map((c) => {
            const isActive = cuentaActiva?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCuenta(c)}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                  isActive
                    ? "border-[#1a2d4f] bg-[#091120] shadow-lg ring-1 ring-[#0e76fd]/30"
                    : "border-[#141d2f] bg-[#080d19] hover:border-[#1a2d4f]"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{c.tipo_cuenta || "Cuenta de Ahorros"}</span>
                  <span className="font-mono text-slate-400">•••• {c.numero_cuenta ? c.numero_cuenta.slice(-4) : "0000"}</span>
                </div>

                <div className="my-3">
                  <p className="font-display text-2xl font-bold text-white tracking-tight">
                    {fmt(parseFloat(c.saldo as any) || 0)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Disponible hoy</span>
                  {isActive ? (
                    <span className="text-emerald-400 font-semibold">● Seleccionada</span>
                  ) : (
                    <span className="text-slate-500">Seleccionar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FILA 3: ÚLTIMOS MOVIMIENTOS Y GASTOS 2026 */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ÚLTIMOS MOVIMIENTOS */}
        <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">
              Últimos movimientos
            </h2>
            <button
              onClick={onOpenCuentas}
              className="text-xs font-semibold text-[#0e76fd] hover:text-[#38bdf8] transition-colors"
            >
              Ver todos
            </button>
          </div>

          <div className="divide-y divide-[#131b2c]">
            {movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.slice(0, 6).map((m) => {
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
                        <p className="text-[11px] text-slate-400">
                          {m.tipo_operacion} ·{" "}
                          {new Date(m.fecha_hora).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
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

        {/* GASTOS 2026 */}
        <section className="rounded-2xl border border-[#141d2f] bg-[#080d19] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Gastos 2026</h2>
              <p className="text-xs text-slate-400">Por mes</p>
            </div>
            <span className="rounded-xl bg-[#111b2c] px-3 py-1 text-xs font-semibold text-slate-300 border border-[#1b2a45]">
              Noviembre
            </span>
          </div>

          <div className="flex h-44 items-end justify-between gap-1.5 pt-4">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  style={{ height: `${h}%` }}
                  className={`w-full rounded-t-md transition-all ${
                    i === 10
                      ? "bg-[#00d2ff] shadow-lg shadow-cyan-500/40"
                      : "bg-[#12427a] hover:bg-[#1a559d]"
                  }`}
                />
                <span className="font-mono text-[10px] text-slate-400">
                  {months[i]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-[#09101c] p-3 text-xs border border-[#141d2f]">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px]">Gastos acumulados del mes:</span>
              <span className="font-mono font-bold text-cyan-400">{fmt(totalGastos)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
