import { Bell, Landmark, LogOut, Menu } from "lucide-react";
import { Usuario } from "./types";

interface BancaHeaderProps {
  usuario: Usuario | null;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenSearch?: () => void;
  onToggleMenu?: () => void;
}

export function BancaHeader({
  usuario,
  onRefresh,
  onLogout,
  onToggleMenu,
}: BancaHeaderProps) {
  // Saludo dinámico según la hora del día
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  const nombreCompleto = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`
    : "Cliente Bancario";
  const primerNombre = usuario ? usuario.nombres.split(" ")[0] : "Cliente";

  return (
    <header className="border-b border-[#141d2f] bg-[#070b13]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
        {/* VISTA DESKTOP: SALUDO AL CLIENTE */}
        <div className="hidden lg:block">
          <p className="text-xs text-slate-400 font-normal">{saludo}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white mt-0.5">
            {nombreCompleto}
          </h1>
        </div>

        {/* VISTA MÓVIL: BOTÓN HAMBURGUESA + LOGO BANCA VERDE */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 lg:hidden">
          <button
            onClick={onToggleMenu}
            aria-label="Abrir menú"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0e172a] border border-[#1e2f4d] text-cyan-400 hover:text-white hover:bg-[#121c30] active:scale-95 transition-all shadow-sm"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0e76fd] text-white shadow-md shadow-blue-500/25">
              <Landmark className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-sm font-bold text-white tracking-tight block leading-tight truncate">
                Banca Rota
              </span>
              <p className="text-[10px] text-slate-400 leading-tight truncate">
                {saludo} {primerNombre}
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL HEADER MÓVIL Y DESKTOP */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* NOTIFICACIONES / ACTUALIZAR */}
          <button
            aria-label="Actualizar datos"
            className="relative grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] active:scale-95 transition-all"
            onClick={onRefresh}
            title="Actualizar saldo y movimientos"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </button>

          {/* CERRAR SESIÓN */}
          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all lg:hidden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
