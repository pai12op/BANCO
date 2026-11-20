import { useState } from "react";
import { Search, Lock, Unlock, CreditCard, DollarSign, Trash2, X, AlertTriangle } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

interface AdminClientesTableProps {
  clientes: any[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleEstado: (cliente: any) => void;
  onEliminarCliente?: (cliente: any) => void;
  onRefresh?: () => void;
  onQuickConsignar?: (cliente: any) => void;
  aiFilterLabel?: string | null;
  onClearAiFilter?: () => void;
  title?: string;
}

export function AdminClientesTable({
  clientes,
  searchTerm,
  onSearchChange,
  onToggleEstado,
  onEliminarCliente,
  onRefresh,
  onQuickConsignar,
  aiFilterLabel,
  onClearAiFilter,
  title = "Clientes Recientes",
}: AdminClientesTableProps) {
  const [statusFilter, setStatusFilter] = useState<"todos" | "activos" | "bloqueados">("todos");
  const [clienteAEliminar, setClienteAEliminar] = useState<any | null>(null);

  const getEsActivo = (c: any) => {
    const estado =
      c.estado_cuenta ||
      c.estado ||
      c.estado_cliente ||
      (c.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
    return estado === "ACTIVO" || estado === "ACTIVA";
  };

  const totalCount = clientes.length;
  const activosCount = clientes.filter((c) => getEsActivo(c)).length;
  const bloqueadosCount = totalCount - activosCount;

  const clientesFiltrados = clientes.filter((c) => {
    const esActivo = getEsActivo(c);
    if (statusFilter === "activos" && !esActivo) return false;
    if (statusFilter === "bloqueados" && esActivo) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombres?.toLowerCase().includes(term) ||
      c.apellidos?.toLowerCase().includes(term) ||
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term) ||
      c.correo?.toLowerCase().includes(term) ||
      c.numero_documento?.includes(term) ||
      c.numero_cuenta?.includes(term)
    );
  });

  return (
    <div className="space-y-3.5">
      {/* ENCABEZADO EXTERIOR COMO EN EL DISEÑO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-4.5 w-4.5 text-blue-400" />
          <h3 className="font-display text-xl font-bold text-white tracking-tight">{title}</h3>
          {aiFilterLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-[11px] font-semibold text-cyan-300">
              Filtro IA: {aiFilterLabel}
              {onClearAiFilter && (
                <button
                  type="button"
                  onClick={onClearAiFilter}
                  className="hover:text-white ml-0.5"
                  title="Quitar filtro IA"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-[#1e3154] bg-[#0b1528] hover:bg-[#132342] px-3.5 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Actualizar
          </button>
        )}
      </div>

      {/* CONTENEDOR DE TABLA */}
      <section className="rounded-3xl border border-[#1b2c4d] bg-[#0a1324] overflow-hidden shadow-xl">
        {/* BARRA DE PESTAÑAS Y BUSCADOR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:px-6 border-b border-[#142038]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("todos")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === "todos"
                  ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-[#111e36]"
              }`}
            >
              <span>Todos</span>
              <span className={statusFilter === "todos" ? "text-blue-100" : "text-slate-500"}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("activos")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === "activos"
                  ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-[#111e36]"
              }`}
            >
              <span>Activos</span>
              <span className={statusFilter === "activos" ? "text-blue-100" : "text-slate-500"}>
                {activosCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("bloqueados")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === "bloqueados"
                  ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-[#111e36]"
              }`}
            >
              <span>Bloqueados</span>
              <span className={statusFilter === "bloqueados" ? "text-blue-100" : "text-slate-500"}>
                {bloqueadosCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#1d2e50] bg-[#070d19] px-3.5 py-2 text-xs text-slate-200 w-full sm:w-72 focus-within:border-blue-500/50 transition-colors">
            <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              placeholder="Buscar por cédula, nombre o cuenta..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent outline-none w-full placeholder:text-slate-500 text-slate-200"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#142038] bg-[#08101f]/60 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 pl-6 pr-3">Cliente</th>
                <th className="py-3.5 px-3">Documento</th>
                <th className="py-3.5 px-3">No. Cuenta</th>
                <th className="py-3.5 px-3">Saldo Disponible</th>
                <th className="py-3.5 px-3">Estado</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131f36]">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron registros que coincidan con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cli) => {
                  const esActivo = getEsActivo(cli);
                  const iniciales = `${cli.nombres?.[0] || "C"}${cli.apellidos?.[0] || "B"}`.toUpperCase();

                  return (
                    <tr
                      key={`${cli.id}-${cli.numero_cuenta || "nc"}`}
                      className="hover:bg-[#0e1a31]/60 transition-colors"
                    >
                      {/* CLIENTE + AVATAR */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full grid place-items-center text-xs font-bold shrink-0 border ${
                              esActivo
                                ? "bg-[#102344] text-blue-400 border-blue-500/30"
                                : "bg-rose-950/60 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {iniciales}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-xs truncate">
                              {cli.nombres} {cli.apellidos}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{cli.correo}</p>
                          </div>
                        </div>
                      </td>

                      {/* DOCUMENTO */}
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {cli.tipo_doc || cli.tipo_documento || "CC"} {cli.numero_documento}
                      </td>

                      {/* NO. CUENTA */}
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {cli.numero_cuenta || "Sin cuenta"}
                      </td>

                      {/* SALDO DISPONIBLE */}
                      <td className="py-3.5 px-3 font-mono text-sm font-bold text-white whitespace-nowrap">
                        {cli.saldo !== undefined && cli.saldo !== null ? fmt(Number(cli.saldo)) : "$ 0"}
                      </td>

                      {/* ESTADO */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {esActivo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            ACTIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            BLOQUEADA
                          </span>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {onQuickConsignar && cli.numero_cuenta && esActivo && (
                            <button
                              type="button"
                              onClick={() => onQuickConsignar(cli)}
                              title="Consignar por ventanilla a esta cuenta"
                              className="inline-flex items-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 transition-all"
                            >
                              <DollarSign className="h-3 w-3" />
                              <span className="hidden xl:inline">Consignar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onToggleEstado(cli)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                              esActivo
                                ? "border-[#223558] bg-[#0d172b] text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {esActivo ? (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>Bloquear</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>Activar</span>
                              </>
                            )}
                          </button>

                          {onEliminarCliente && (
                            <button
                              type="button"
                              onClick={() => setClienteAEliminar(cli)}
                              title="Eliminar cliente y sus cuentas definitivamente"
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition-all"
                            >
                              <Trash2 className="h-3 w-3 text-rose-400" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN SEGURA */}
      {clienteAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c1424] p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-base font-bold text-white">¿Eliminar Cliente Definitivamente?</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Esta acción es irreversible y eliminará al cliente, su cuenta bancaria y su historial contable en cascada.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#1b2b48] bg-[#070d18] p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Titular:</span>
                <span className="font-semibold text-white">{clienteAEliminar.nombres} {clienteAEliminar.apellidos}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Documento:</span>
                <span className="font-mono">{clienteAEliminar.tipo_doc || "CC"} {clienteAEliminar.numero_documento}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Cuenta:</span>
                <span className="font-mono text-cyan-400">{clienteAEliminar.numero_cuenta || "Sin cuenta"}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Saldo actual:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {fmt(Number(clienteAEliminar.saldo || 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClienteAEliminar(null)}
                className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = clienteAEliminar;
                  setClienteAEliminar(null);
                  if (onEliminarCliente) {
                    onEliminarCliente(target);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
