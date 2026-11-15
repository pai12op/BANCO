import { useState } from "react";
import { RefreshCw, Search, History, ArrowUpRight, ArrowDownLeft, X } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

interface AdminAuditoriaTableProps {
  auditoria: any[];
  onRefresh: () => void;
}

export function AdminAuditoriaTable({ auditoria, onRefresh }: AdminAuditoriaTableProps) {
  const [canalFilter, setCanalFilter] = useState<string>("TODOS");
  const [search, setSearch] = useState("");

  const filtrados = auditoria.filter((a) => {
    if (canalFilter !== "TODOS" && a.canal?.toUpperCase() !== canalFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      a.numero_cuenta?.includes(t) ||
      a.tipo_operacion?.toLowerCase().includes(t) ||
      a.descripcion?.toLowerCase().includes(t) ||
      a.canal?.toLowerCase().includes(t) ||
      String(a.id).includes(t)
    );
  });

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History className="h-4.5 w-4.5 text-cyan-400" />
          <h3 className="font-display text-xl font-bold text-white tracking-tight">
            Libro General de Auditoría
          </h3>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e3154] bg-[#0b1528] hover:bg-[#132342] px-3.5 py-1.5 text-xs font-semibold text-cyan-400 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      <section className="rounded-3xl border border-[#1b2c4d] bg-[#0a1324] overflow-hidden shadow-xl">
        {/* BARRA DE FILTROS DE AUDITORÍA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:px-6 border-b border-[#142038]">
          <div className="flex flex-wrap items-center gap-1.5">
            {["TODOS", "WEB", "CAJERO", "VENTANILLA"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCanalFilter(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  canalFilter === c
                    ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-[#111e36]"
                }`}
              >
                {c === "TODOS" ? `Todos (${auditoria.length})` : c}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#1d2e50] bg-[#070d19] px-3.5 py-2 text-xs text-slate-200 w-full sm:w-64 focus-within:border-blue-500/50">
            <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              placeholder="Buscar cuenta, operación o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full placeholder:text-slate-500 text-slate-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#142038] bg-[#08101f] text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 pl-6 pr-3">ID</th>
                <th className="py-3.5 px-3">Fecha / Hora</th>
                <th className="py-3.5 px-3">Canal</th>
                <th className="py-3.5 px-3">Operación</th>
                <th className="py-3.5 px-3">No. Cuenta</th>
                <th className="py-3.5 px-3">Monto</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Saldo Resultante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131f36]">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-sans text-xs">
                    No hay movimientos registrados para este filtro.
                  </td>
                </tr>
              ) : (
                filtrados.map((a) => {
                  const esCredito = a.sentido === "CREDITO";
                  return (
                    <tr key={a.id} className="hover:bg-[#0e1a31]/60 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 text-slate-400">#{a.id}</td>
                      <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                        {new Date(a.fecha_hora).toLocaleString("es-CO")}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="rounded-lg border border-[#1e3154] bg-[#0d172b] px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          {a.canal}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-sans font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          {esCredito ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          )}
                          <span>{a.tipo_operacion || a.descripcion}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-cyan-400 font-semibold whitespace-nowrap">
                        {a.numero_cuenta}
                      </td>
                      <td
                        className={`py-3.5 px-3 font-bold whitespace-nowrap ${
                          esCredito ? "text-emerald-400" : "text-slate-100"
                        }`}
                      >
                        {esCredito ? "+" : "-"}
                        {fmt(Number(a.valor))}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right text-slate-300 whitespace-nowrap">
                        {fmt(Number(a.saldo_resultante))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
