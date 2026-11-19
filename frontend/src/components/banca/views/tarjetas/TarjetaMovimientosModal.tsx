import { ArrowDownLeft, Search, ShoppingBag, X } from "lucide-react";
import { formatCOP } from "@/lib/formatters";
import type { Movimiento } from "../../types";

interface TarjetaMovimientosModalProps {
  open: boolean;
  movimientos: Movimiento[];
  searchMovimiento: string;
  filtroTipo: "TODOS" | "COMPRAS" | "INGRESOS";
  onSearchChange: (val: string) => void;
  onFiltroChange: (val: "TODOS" | "COMPRAS" | "INGRESOS") => void;
  onClose: () => void;
}

export function TarjetaMovimientosModal({
  open,
  movimientos,
  searchMovimiento,
  filtroTipo,
  onSearchChange,
  onFiltroChange,
  onClose,
}: TarjetaMovimientosModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-[#1a2b4a] bg-[#0a1224] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#182642]">
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Movimientos de tu Tarjeta
            </h3>
            <p className="text-xs text-slate-400">
              Transacciones en vivo conectadas al núcleo bancario seguro
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center rounded-xl border border-[#172542] bg-[#080d19] px-3 py-2 text-xs">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar compra o establecimiento..."
              value={searchMovimiento}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-2">
            {(["TODOS", "COMPRAS", "INGRESOS"] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => onFiltroChange(tipo)}
                className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all ${
                  filtroTipo === tipo
                    ? "bg-[#0e76fd] text-white shadow-sm"
                    : "bg-[#080d19] text-slate-400 hover:text-white border border-[#16233d]"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#141f36] pr-1">
          {movimientos.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No se encontraron movimientos registrados para este filtro.
            </div>
          ) : (
            movimientos.map((m) => {
              const esIngreso = m.sentido === "CREDITO";
              return (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
                        esIngreso
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-[#111c33] text-slate-300"
                      }`}
                    >
                      {esIngreso ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {m.descripcion || m.tipo_operacion}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(m.fecha_hora).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-3 shrink-0">
                    <p
                      className={`font-mono text-xs font-bold ${
                        esIngreso ? "text-emerald-400" : "text-slate-100"
                      }`}
                    >
                      {esIngreso ? `+${formatCOP(m.valor)}` : `-${formatCOP(m.valor)}`}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Saldo: {formatCOP(m.saldo_resultante)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
