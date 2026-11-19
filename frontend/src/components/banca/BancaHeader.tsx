import { useState, useRef, useEffect } from "react";
import { Bell, Landmark, LogOut, Menu, CreditCard, ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import { Usuario } from "./types";

export interface BankNotification {
  id: string;
  title: string;
  detail: string;
  time: string;
}

interface BancaHeaderProps {
  usuario: Usuario | null;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenSearch?: () => void;
  onToggleMenu?: () => void;
  notifications?: BankNotification[];
  unreadCount?: number;
  onMarkNotificationsRead?: () => void;
}

export function BancaHeader({
  usuario,
  onRefresh,
  onLogout,
  onToggleMenu,
  notifications = [],
  unreadCount = 0,
  onMarkNotificationsRead,
}: BancaHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días," : hora < 19 ? "Buenas tardes," : "Buenas noches,";

  const nombreCompleto = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`
    : "Cliente Bancario";
  const primerNombre = usuario ? usuario.nombres.split(" ")[0] : "Cliente";

  const toggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && unreadCount > 0) {
      onMarkNotificationsRead?.();
    }
  };

  return (
    <header className="border-b border-[#141d2f] bg-[#070b13]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 w-full max-w-full">
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
          {/* ACCESOS RÁPIDOS DIRECTOS */}
          <a
            href="/cajero"
            title="Ir al Cajero Automático ATM"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-[#0d1524] transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
            <span>Cajero ATM</span>
          </a>
          <a
            href="/admin"
            title="Ir a Consola Administrativa"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-purple-400 px-2.5 py-1.5 rounded-xl border border-purple-500/30 bg-purple-950/30 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>Consola Admin</span>
          </a>

          {/* ACTUALIZAR SALDO */}
          <button
            aria-label="Actualizar datos"
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-cyan-400 hover:bg-[#121c30] active:scale-95 transition-all"
            onClick={onRefresh}
            title="Actualizar saldo y movimientos"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* CENTRO DE NOTIFICACIONES */}
          <div className="relative" ref={dropdownRef}>
            <button
              aria-label="Notificaciones bancarias"
              className="relative grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#0d1524] border border-[#1a273f] text-slate-300 hover:text-white hover:bg-[#121c30] active:scale-95 transition-all"
              onClick={toggleNotif}
              title="Notificaciones de operaciones"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-slate-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 sm:w-80 rounded-2xl border border-[#1b2b4a] bg-[#0a1324] p-3 shadow-2xl shadow-black/60">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-emerald-400" />
                    Notificaciones de Sesión
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {notifications.length} eventos
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Aún no hay notificaciones registradas en esta sesión.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-xl border border-slate-800/80 bg-[#0d182d] p-2.5 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white leading-tight">{n.title}</p>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                              {n.detail}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

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
