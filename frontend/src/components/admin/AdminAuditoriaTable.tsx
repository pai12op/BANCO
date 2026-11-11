import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminAuditoriaTableProps {
  auditoria: any[];
  onRefresh: () => void;
}

export function AdminAuditoriaTable({ auditoria, onRefresh }: AdminAuditoriaTableProps) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold">Historial General de Auditoría</h3>
          <p className="text-xs text-muted-foreground">Registro de todas las transacciones del banco</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 text-xs gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b bg-secondary/40 text-muted-foreground sticky top-0">
            <tr>
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Fecha / Hora</th>
              <th className="p-2.5">Canal</th>
              <th className="p-2.5">Tipo</th>
              <th className="p-2.5">Cuenta</th>
              <th className="p-2.5">Monto</th>
              <th className="p-2.5">Saldo Resultante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {auditoria.map((a) => {
              const esCredito = a.sentido === "CREDITO";
              return (
                <tr key={a.id} className="hover:bg-secondary/20">
                  <td className="p-2.5 text-muted-foreground">#{a.id}</td>
                  <td className="p-2.5">{new Date(a.fecha_hora).toLocaleString("es-CO")}</td>
                  <td className="p-2.5">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                      {a.canal}
                    </span>
                  </td>
                  <td className="p-2.5 font-semibold text-slate-200">
                    {a.tipo_operacion || a.descripcion}
                  </td>
                  <td className="p-2.5 text-cyan-400 font-semibold">{a.numero_cuenta}</td>
                  <td className={`p-2.5 font-bold ${esCredito ? "text-emerald-400" : "text-slate-200"}`}>
                    {esCredito ? "+" : "-"}{fmt(a.valor)}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{fmt(a.saldo_resultante)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
