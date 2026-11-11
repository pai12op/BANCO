import { Search, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminClientesTableProps {
  clientes: any[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleEstado: (cliente: any) => void;
}

export function AdminClientesTable({
  clientes,
  searchTerm,
  onSearchChange,
  onToggleEstado,
}: AdminClientesTableProps) {
  const clientesFiltrados = clientes.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombres?.toLowerCase().includes(term) ||
      c.apellidos?.toLowerCase().includes(term) ||
      c.numero_documento?.includes(term) ||
      c.numero_cuenta?.includes(term)
    );
  });

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-bold">Listado de Clientes y Cuentas</h3>
          <p className="text-xs text-muted-foreground">Control de estado activo / suspendido</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 text-xs text-muted-foreground w-full sm:w-auto">
          <Search className="h-3.5 w-3.5" />
          <input
            placeholder="Buscar por cédula o nombre..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent outline-none w-full sm:w-56"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-secondary/40 text-muted-foreground font-mono uppercase">
            <tr>
              <th className="p-3">Doc</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Correo</th>
              <th className="p-3">No. Cuenta</th>
              <th className="p-3">Saldo</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {clientesFiltrados.map((cli) => {
              const estado = cli.estado || cli.estado_cliente || (cli.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
              const esActivo = estado === "ACTIVO";
              return (
                <tr key={cli.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3 font-mono font-semibold">
                    {cli.tipo_doc || "CC"} {cli.numero_documento}
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    {cli.nombres} {cli.apellidos}
                  </td>
                  <td className="p-3 text-muted-foreground">{cli.correo}</td>
                  <td className="p-3 font-mono text-cyan-400 font-semibold">
                    {cli.numero_cuenta || "Sin cuenta"}
                  </td>
                  <td className="p-3 font-mono font-bold text-foreground">
                    {cli.saldo !== undefined ? fmt(cli.saldo) : "$ 0 COP"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        esActivo
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {estado}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleEstado(cli)}
                      className={`h-7 px-2.5 text-[11px] gap-1 ${
                        esActivo
                          ? "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                          : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      {esActivo ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {esActivo ? "Bloquear" : "Activar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
