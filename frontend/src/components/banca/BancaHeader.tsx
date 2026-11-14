import { useState } from "react";
import { Search, Bell, Landmark, LogOut, Menu, HelpCircle, Lock, User, X } from "lucide-react";
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
  onOpenSearch,
  onToggleMenu,
}: BancaHeaderProps) {
  const [showAyuda, setShowAyuda] = useState(false);

  // Saludo dinámico según la hora del día
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  const nombreCompleto = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`
    : "Andrés Pai";
  const primerNombre = usuario ? usuario.nombres.split(" ")[0] : "Andrés";

  return (
    <>
      <header className="border-b border-[#141d2f] bg-[#070b13]/95 backdrop-blur-md px-3.5 py-3 sm:px-4 lg:px-8 sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          {/* VISTA DESKTOP: SALUDO AL CLIENTE */}
          <div className="hidden lg:block">
            <p className="text-xs text-slate-400 font-normal">{saludo}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white mt-0.5">
              {nombreCompleto}
            </h1>
          </div>

          {/* VISTA MÓVIL ESTILO NEQUI EXACTO A LA IMAGEN 1 */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              onClick={onToggleMenu}
              aria-label="Abrir perfil y menú"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0e172a] border border-[#1e2f4d] text-slate-200 hover:text-white active:scale-95 transition-all shadow-inner"
            >
              <User className="h-5 w-5 text-cyan-400" />
            </button>
            <div className="min-w-0" onClick={onToggleMenu} role="button">
              <p className="text-[11px] text-slate-400 leading-tight">Hola,</p>
              <p className="font-display text-sm font-bold text-white tracking-tight leading-tight truncate max-w-[140px]">
                {nombreCompleto}
              </p>
            </div>
          </div>

          {/* ACCIONES DEL HEADER MÓVIL ESTILO NEQUI: CAMPANA, AYUDA, CANDADO */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              aria-label="Buscar"
              className="hidden sm:grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* NOTIFICACIONES / ACTUALIZAR */}
            <button
              aria-label="Notificaciones"
              className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] active:scale-95 transition-all"
              onClick={onRefresh}
              title="Notificaciones · Refrescar datos"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </button>

            {/* AYUDA (?) ESTILO NEQUI */}
            <button
              onClick={() => setShowAyuda(true)}
              aria-label="Centro de ayuda"
              title="Ayuda y soporte"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] active:scale-95 transition-all"
            >
              <HelpCircle className="h-4 w-4 text-cyan-400" />
            </button>

            {/* CANDADO / CERRAR SESIÓN ESTILO NEQUI */}
            <button
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión segura"
              className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
            >
              <Lock className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MODAL RÁPIDO DE AYUDA Y SOPORTE 24/7 */}
      {showAyuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-[#1d2f50] bg-[#0a1224] p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-display font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-cyan-400" /> Centro de Ayuda
              </span>
              <button
                onClick={() => setShowAyuda(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                <p className="font-bold text-cyan-300">💡 Clave PIN de Cajero y Datáfono:</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Tu clave asignada por defecto es <span className="font-mono font-bold text-white">1234</span>.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b13] p-3 space-y-1">
                <p className="font-bold text-white">🛵 Soporte Domicilios Llorente:</p>
                <p className="text-[11px] text-slate-400">Línea directa WhatsApp: +57 323 459 4161</p>
                <p className="text-[11px] text-slate-400">Atención 24/7 en Manizales y Caldas.</p>
              </div>
            </div>
            <button
              onClick={() => setShowAyuda(false)}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-bold text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
