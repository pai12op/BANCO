import { Search, Bell, Landmark, LogOut } from "lucide-react";
import { Usuario } from "./types";

interface BancaHeaderProps {
  usuario: Usuario | null;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenSearch?: () => void;
}

export function BancaHeader({
  usuario,
  onRefresh,
  onLogout,
  onOpenSearch,
}: BancaHeaderProps) {
  // Saludo dinámico según la hora del día
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  const nombreCompleto = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`
    : "Andrés Paiwa";
  const primerNombre = usuario ? usuario.nombres.split(" ")[0] : "Andrés";

  return (
    <header className="border-b border-[#141d2f] bg-[#070b13]/80 backdrop-blur-md px-4 py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        {/* VISTA DESKTOP: SALUDO AL CLIENTE */}
        <div className="hidden lg:block">
          <p className="text-xs text-slate-400 font-normal">{saludo}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white mt-0.5">
            {nombreCompleto}
          </h1>
        </div>

        {/* VISTA MÓVIL / TABLET: LOGO BANCA VERDE + NOMBRE */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#0e76fd] text-white shadow-md shadow-blue-500/25">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-base font-bold text-white tracking-tight">
              Banca Verde
            </span>
            <p className="text-[11px] text-slate-400">
              {saludo} {primerNombre}
            </p>
          </div>
        </div>

        {/* ACCIONES DEL HEADER: BÚSQUEDA Y NOTIFICACIONES EXACTOS A LA MAQUETA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSearch}
            aria-label="Buscar"
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            aria-label="Notificaciones y actualizar"
            className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] transition-colors"
            onClick={onRefresh}
            title="Actualizado · Clic para refrescar datos"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#0e76fd]" />
          </button>

          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors lg:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
