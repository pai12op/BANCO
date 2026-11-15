import { ShieldCheck, LogOut, RefreshCw, Landmark, CreditCard } from "lucide-react";

interface AdminHeaderProps {
  autenticado: boolean;
  onLogout: () => void;
  onRefresh?: () => void;
}

export function AdminHeader({ autenticado, onLogout, onRefresh }: AdminHeaderProps) {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  return (
    <header className="border-b border-[#141f35] bg-[#070b13]/95 backdrop-blur-md px-4 py-3.5 lg:px-8 sticky top-0 z-20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        {/* DESKTOP: SALUDO AL ADMINISTRADOR */}
        <div className="hidden lg:block">
          <p className="text-xs text-slate-400 font-normal">{saludo}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white mt-0.5">
            Carlos Mendoza
          </h1>
        </div>

        {/* MOBILE: LOGO Y NOMBRE */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#0e76fd] text-white shadow-md shadow-blue-600/30">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-base font-bold text-white tracking-tight block leading-tight">
              Banca Rota
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">{saludo} Carlos Mendoza</p>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2">
          <a
            href="/cajero"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-cyan-400 px-3.5 py-2 rounded-xl border border-[#1c2c4c] bg-[#0c1526] hover:border-cyan-500/40 transition-all"
          >
            <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
            <span>Cajero ATM</span>
          </a>

          <a
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-blue-400 px-3.5 py-2 rounded-xl border border-[#1c2c4c] bg-[#0c1526] hover:border-blue-500/40 transition-all"
          >
            <Landmark className="h-3.5 w-3.5 text-blue-400" />
            <span>Banca Clientes</span>
          </a>

          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Actualizar datos"
              title="Actualizar métricas del banco"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#0c1526] border border-[#1c2c4c] text-slate-300 hover:text-white hover:bg-[#122038] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {autenticado && (
            <button
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión administrativa"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#0c1526] border border-[#1c2c4c] text-blue-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
