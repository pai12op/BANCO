import { Users, CreditCard, Lock, DollarSign } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminKpisProps {
  kpis: {
    totalClientes: number;
    cuentasActivas: number;
    cuentasBloqueadas: number;
    totalBoveda: number;
  };
}

export function AdminKpis({ kpis }: AdminKpisProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* KPI 1 */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-400 font-semibold uppercase">Total Clientes</span>
          <Users className="h-5 w-5 text-blue-400" />
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.totalClientes}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Registrados en MySQL</p>
      </div>

      {/* KPI 2 */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-semibold uppercase">Cuentas Activas</span>
          <CreditCard className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.cuentasActivas}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Operativas para transacciones</p>
      </div>

      {/* KPI 3 */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-rose-400 font-semibold uppercase">Bloqueadas</span>
          <Lock className="h-5 w-5 text-rose-400" />
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.cuentasBloqueadas}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Cuentas suspendidas</p>
      </div>

      {/* KPI 4 */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-amber-400 font-semibold uppercase">Bóveda Total</span>
          <DollarSign className="h-5 w-5 text-amber-400" />
        </div>
        <p className="mt-2 font-display text-2xl font-bold text-amber-300 truncate">
          {fmt(kpis.totalBoveda)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Saldo global en custodia</p>
      </div>
    </div>
  );
}
