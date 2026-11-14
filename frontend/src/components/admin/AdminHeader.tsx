import { ShieldCheck, LogOut, RefreshCw, Landmark, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  autenticado: boolean;
  onLogout: () => void;
  onRefresh?: () => void;
}

export function AdminHeader({ autenticado, onLogout, onRefresh }: AdminHeaderProps) {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  return (
    <header className="border-b border-[#141d2f] bg-[#070b13]/80 backdrop-blur-md px-4 py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        {/* DESKTOP: SALUDO AL ADMINISTRADOR */}
        <div className="hidden lg:block">
          <p className="text-xs text-slate-400 font-normal">{saludo} Oficial de Crédito</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Carlos Alberto Mendoza
            </h1>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
              Gerencia / Admin
            </span>
          </div>
        </div>

        {/* MOBILE: LOGO Y NOMBRE */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-base font-bold text-white tracking-tight">
              Backoffice
            </span>
            <p className="text-[11px] text-purple-300">Administrador General</p>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refrescar datos en vivo"
              title="Refrescar métricas del banco"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          <a
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-primary px-3 py-1.5 rounded-xl border border-slate-800 bg-[#0d1524] transition-colors"
          >
            <Landmark className="h-3.5 w-3.5" /> Banca Clientes
          </a>

          <a
            href="/cajero"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-xl border border-slate-800 bg-[#0d1524] transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" /> Cajero ATM
          </a>

          {autenticado && (
            <button
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
