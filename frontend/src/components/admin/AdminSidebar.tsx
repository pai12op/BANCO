import {
  LayoutDashboard, Users, DollarSign, History,
  UserPlus, ShieldCheck, LogOut, CreditCard, Landmark
} from "lucide-react";

export type AdminTab = "dashboard" | "clientes" | "ventanilla" | "auditoria" | "nueva_cuenta";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

export function AdminSidebar({ activeTab, onSelectTab, onLogout }: AdminSidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard General", icon: LayoutDashboard },
    { id: "clientes", label: "Gestión de Clientes", icon: Users },
    { id: "ventanilla", label: "Ventanilla de Caja", icon: DollarSign },
    { id: "auditoria", label: "Auditoría General", icon: History },
    { id: "nueva_cuenta", label: "Apertura de Cuenta", icon: UserPlus },
  ];

  return (
    <aside className="fixed top-0 bottom-0 left-0 hidden w-64 flex-col border-r border-[#1a2333] bg-[#070b13] p-5 text-slate-300 z-30 lg:flex">
      {/* BRANDING ADMIN */}
      <div className="mb-7 flex min-w-0 items-center gap-3 pt-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="truncate">
          <span className="truncate font-display text-lg font-bold tracking-tight text-white block">
            Banca Rota
          </span>
          <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase block">
            Consola Backoffice
          </span>
        </div>
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
                  ? "bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:bg-[#121a2a] hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ENLACES RÁPIDOS A OTROS MÓDULOS */}
      <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3">
          Canales en Vivo
        </span>
        <a
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-400 hover:bg-[#121a2a] hover:text-primary transition-colors"
        >
          <Landmark className="h-3.5 w-3.5" />
          <span>Banca Clientes</span>
        </a>
        <a
          href="/cajero"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-400 hover:bg-[#121a2a] hover:text-cyan-400 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Cajero ATM</span>
        </a>
      </div>

      {/* PIE DEL SIDEBAR: ESTADO Y CERRAR SESIÓN */}
      <div className="mt-auto space-y-3 pt-4 border-t border-slate-800/80">
        <div className="rounded-xl bg-[#0d1524] p-3 text-xs border border-[#1a273f]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Motor Transaccional</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">MySQL 3NF (InnoDB)</p>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
