import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard,
  PiggyBank, Landmark, Settings, LogOut
} from "lucide-react";
import { BancaTab } from "./types";

interface BancaSidebarProps {
  activeTab: BancaTab;
  onSelectTab: (tab: BancaTab) => void;
  onLogout: () => void;
}

export function BancaSidebar({ activeTab, onSelectTab, onLogout }: BancaSidebarProps) {
  const navItems: { id: BancaTab; label: string; icon: any }[] = [
    { id: "inicio", label: "Inicio", icon: LayoutDashboard },
    { id: "cuentas", label: "Cuentas", icon: Wallet },
    { id: "transferencias", label: "Transferencias", icon: ArrowLeftRight },
    { id: "tarjetas", label: "Tarjetas", icon: CreditCard },
    { id: "ahorros", label: "Ahorros", icon: PiggyBank },
    { id: "prestamos", label: "Préstamos", icon: Landmark },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <aside className="fixed top-0 bottom-0 left-0 hidden w-64 flex-col border-r border-[#1a2333] bg-[#070b13] p-5 text-slate-300 z-30 lg:flex">
      {/* LOGO DE MARCA EXACTO AL DISEÑO */}
      <div className="mb-7 flex min-w-0 items-center gap-3 pt-2">
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
                  : "text-slate-400 hover:bg-[#121a2a] hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* PIE DEL SIDEBAR: AYUDA Y CERRAR SESIÓN */}
      <div className="mt-auto space-y-3 pt-4">
        <div className="rounded-xl bg-[#0d1524] p-4 text-xs border border-[#1a273f]">
          <p className="font-semibold text-slate-200">¿Necesitas ayuda?</p>
          <p className="mt-1 text-[11px] text-slate-400">Línea 24/7: 01 8000 123 456</p>
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
