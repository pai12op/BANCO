import {
  LayoutDashboard, Users, Wallet, History,
  UserPlus, LogOut, CreditCard, Landmark
} from "lucide-react";

export type AdminTab = "dashboard" | "clientes" | "ventanilla" | "auditoria" | "nueva_cuenta";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

export function AdminSidebar({ activeTab, onSelectTab, onLogout }: AdminSidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "ventanilla", label: "Ventanilla", icon: Wallet },
    { id: "auditoria", label: "Auditoría", icon: History },
    { id: "nueva_cuenta", label: "Apertura de cuenta", icon: UserPlus },
  ];

  return (
    <aside className="fixed top-0 bottom-0 left-0 hidden w-64 flex-col border-r border-[#141f35] bg-[#070b13] p-5 text-slate-300 z-30 lg:flex">
      {/* BRANDING EXACTO AL DISEÑO */}
      <div className="mb-7 flex min-w-0 items-center gap-3 pt-1">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0e76fd] text-white shadow-lg shadow-blue-500/25">
          <Landmark className="h-5 w-5" />
        </div>
        <span className="truncate font-display text-xl font-bold tracking-tight text-white">
          Banca Rota
        </span>
      </div>

      {/* ITEMS DE NAVEGACIÓN */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#0e76fd] text-white font-semibold shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:bg-[#10192b] hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* OTROS CANALES Y MOTOR TRANSACCIONAL */}
      <div className="mt-auto space-y-3 pt-4">
        <div className="space-y-1 pt-2 border-t border-[#141f35]">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Otros Canales
          </p>
          <a
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-[#10192b] hover:text-white transition-all"
          >
            <Landmark className="h-3.5 w-3.5 text-blue-400" />
            <span>Banca Clientes</span>
          </a>
          <a
            href="/cajero"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-[#10192b] hover:text-white transition-all"
          >
            <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
            <span>Cajero Automático ATM</span>
          </a>
        </div>

        <div className="rounded-xl bg-[#0b1324] p-3.5 text-xs border border-[#172642]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Motor transaccional</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">MySQL 3NF · InnoDB · En línea</p>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
