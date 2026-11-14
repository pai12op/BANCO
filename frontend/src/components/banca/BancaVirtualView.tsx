import { useState, useEffect } from "react";
import { toast } from "sonner";
import { BancaTab, Cuenta, Movimiento, Usuario } from "./types";
import { BancaSidebar } from "./BancaSidebar";
import { BancaHeader } from "./BancaHeader";
import { BancaLogin } from "./BancaLogin";
import { InicioView } from "./views/InicioView";
import { CuentasView } from "./views/CuentasView";
import { TransferenciasView } from "./views/TransferenciasView";
import { TarjetasView } from "./views/TarjetasView";
import { AhorrosView } from "./views/AhorrosView";
import { PrestamosView } from "./views/PrestamosView";
import { AjustesView } from "./views/AjustesView";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard,
  PiggyBank, Landmark, Settings, MoreHorizontal, LogOut, X,
  Menu, ChevronRight, ShieldCheck, DollarSign
} from "lucide-react";

export function BancaVirtualView() {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaActiva, setCuentaActiva] = useState<Cuenta | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<BancaTab>("inicio");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [showFabModal, setShowFabModal] = useState(false);

  // Cargar datos de resumen desde MySQL
  const cargarResumen = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/banca/resumen", { credentials: "include" });
      if (res.status === 401) {
        setUsuario(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.usuario) {
        setUsuario(data.usuario);
        setCuentas(data.cuentas || []);
        if (data.cuentas && data.cuentas.length > 0) {
          const cuentaActual = cuentaActiva
            ? data.cuentas.find((c: Cuenta) => c.id === cuentaActiva.id) || data.cuentas[0]
            : data.cuentas[0];
          setCuentaActiva(cuentaActual);
          cargarMovimientos(cuentaActual.id);
        }
      }
    } catch (err) {
      console.error("Error al cargar resumen:", err);
      toast.error("Error de conexión con el backend.");
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientos = async (cuentaId: number) => {
    try {
      const res = await fetch(`/api/banca/movimientos?cuenta_id=${cuentaId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data.movimientos || []);
      }
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, []);

  const handleLogin = async (identificador: string, pass: string) => {
    try {
      setLoginLoading(true);
      const res = await fetch("/api/auth/login-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password: pass }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales incorrectas.");
        return;
      }
      toast.success(`Bienvenido(a), ${data.usuario.nombres}`);
      cargarResumen();
    } catch (err) {
      toast.error("Error de conexión al iniciar sesión.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUsuario(null);
      setCuentas([]);
      setCuentaActiva(null);
      setMovimientos([]);
      setActiveTab("inicio");
      setShowMobileMore(false);
      toast.info("Sesión cerrada correctamente.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTelefono = async (nuevoTel: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/banca/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: nuevoTel }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar perfil.");
        return false;
      }
      if (usuario) setUsuario({ ...usuario, telefono: nuevoTel });
      return true;
    } catch (err) {
      toast.error("Error de comunicación.");
      return false;
    }
  };

  const handleCambiarPassword = async (passAct: string, passNew: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/banca/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_actual: passAct, password_nuevo: passNew }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar contraseña.");
        return false;
      }
      return true;
    } catch (err) {
      toast.error("Error de comunicación.");
      return false;
    }
  };

  const saldoReal = cuentaActiva ? cuentaActiva.saldo : 1000000;

  const movimientosFiltrados = movimientos.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.descripcion?.toLowerCase().includes(term) ||
      m.tipo_operacion?.toLowerCase().includes(term) ||
      m.valor?.toString().includes(term)
    );
  });

  // 1. ESTADO DE CARGA: PANTALLA OSCURA CON SPINNER (EVITA DESTELLOS DEL DASHBOARD INTERNO)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-lg shadow-primary/20" />
        <span className="mt-4 text-xs font-mono tracking-wider text-slate-500">Verificando sesión bancaria...</span>
      </div>
    );
  }

  // 2. SI NO HAY USUARIO AUTENTICADO: LOGIN LIMPIO Y AISLADO
  if (!usuario) {
    return <BancaLogin onLogin={handleLogin} loading={loginLoading} />;
  }

  // NAVEGACIÓN MÓVIL EXACTA A LA IMAGEN 3
  const mobileNavItems: { id: BancaTab; label: string; icon: any }[] = [
    { id: "inicio", label: "Inicio", icon: LayoutDashboard },
    { id: "cuentas", label: "Cuentas", icon: Wallet },
    { id: "transferencias", label: "Transferir", icon: ArrowLeftRight },
    { id: "tarjetas", label: "Tarjetas", icon: CreditCard },
  ];

  const selectTab = (tab: BancaTab) => {
    setActiveTab(tab);
    setShowMobileMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#070b13] font-sans text-slate-100">
      {/* SIDEBAR DESKTOP PERMANENTE */}
      <BancaSidebar
        activeTab={activeTab}
        onSelectTab={selectTab}
        onLogout={handleLogout}
      />

      {/* ÁREA CENTRAL CON PADDING IZQUIERDO EN DESKTOP */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* HEADER LIMPIO */}
        <BancaHeader
          usuario={usuario}
          onRefresh={cargarResumen}
          onLogout={handleLogout}
          onToggleMenu={() => setShowMobileMore((prev) => !prev)}
        />

        {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 flex-1">
          {activeTab === "inicio" && (
            <InicioView
              usuario={usuario}
              cuentas={cuentas}
              cuentaActiva={cuentaActiva}
              saldoReal={saldoReal}
              movimientosFiltrados={movimientosFiltrados}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onOpenTransferir={() => selectTab("transferencias")}
              onOpenCuentas={() => selectTab("cuentas")}
              onOpenAjustes={() => selectTab("ajustes")}
              onOpenTarjetas={() => selectTab("tarjetas")}
              onRefreshMovimientos={() => cuentaActiva && cargarMovimientos(cuentaActiva.id)}
              onSelectCuenta={(c) => {
                setCuentaActiva(c);
                cargarMovimientos(c.id);
              }}
            />
          )}

          {activeTab === "cuentas" && (
            <CuentasView
              usuario={usuario}
              cuentas={cuentas}
              cuentaActiva={cuentaActiva}
              movimientos={movimientos}
              onSelectCuenta={(c) => {
                setCuentaActiva(c);
                cargarMovimientos(c.id);
              }}
              onOpenTransferir={() => selectTab("transferencias")}
            />
          )}

          {activeTab === "transferencias" && (
            <TransferenciasView
              cuentaActiva={cuentaActiva}
              saldoReal={saldoReal}
              movimientos={movimientos}
              onTransferSuccess={cargarResumen}
            />
          )}

          {activeTab === "tarjetas" && (
            <TarjetasView
              usuario={usuario}
              cuentaActiva={cuentaActiva}
              onRefreshResumen={cargarResumen}
            />
          )}

          {activeTab === "ahorros" && <AhorrosView />}

          {activeTab === "prestamos" && <PrestamosView />}

          {activeTab === "ajustes" && (
            <AjustesView
              usuario={usuario}
              onUpdateTelefono={handleUpdateTelefono}
              onCambiarPassword={handleCambiarPassword}
            />
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MENÚ HAMBURGUESA LATERAL MÓVIL (DRAWER SLIDE-IN)        */}
      {/* ======================================================== */}
      {showMobileMore && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          {/* BACKDROP CON DESENFOQUE */}
          <div
            onClick={() => setShowMobileMore(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* PANEL LATERAL DESLIZANTE */}
          <div className="relative w-4/5 max-w-[320px] h-full bg-[#0a1224] border-r border-[#1a2d4e] p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* ENCABEZADO: PERFIL DEL CLIENTE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#14233e] pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-[#0e76fd] to-[#00d2ff] font-display font-black text-sm text-white shadow-lg shadow-blue-500/30">
                    {usuario ? `${usuario.nombres[0]}${usuario.apellidos[0]}`.toUpperCase() : "JP"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-white truncate leading-tight">
                      {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Jairo Andrés Pai"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      C.C. {usuario?.numero_documento || "1130766219"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Cuenta Activa
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowMobileMore(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* LISTA DE FUNCIONALIDADES CLASIFICADAS */}
              <div className="space-y-4 pt-1">
                {/* GRUPO 1: OPERACIONES */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
                    Operaciones
                  </p>
                  {[
                    { id: "inicio", label: "Inicio / Resumen", icon: LayoutDashboard },
                    { id: "cuentas", label: "Tus Cuentas Bancarias", icon: Wallet },
                    { id: "transferencias", label: "Transferir Dinero", icon: ArrowLeftRight },
                    { id: "tarjetas", label: "Tarjetas & Datáfono", icon: CreditCard, badge: "POS" },
                  ].map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectTab(item.id as BancaTab)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                            : "text-slate-300 hover:bg-[#111e38] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#38bdf8]"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-white/20 text-white" : "bg-cyan-500/20 text-cyan-300"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* GRUPO 2: PRODUCTOS & INVERSIÓN */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
                    Productos & Inversión
                  </p>
                  {[
                    { id: "ahorros", label: "Ahorros y CDT", icon: PiggyBank },
                    { id: "prestamos", label: "Créditos y Préstamos", icon: Landmark },
                  ].map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectTab(item.id as BancaTab)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                            : "text-slate-300 hover:bg-[#111e38] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#38bdf8]"}`} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    );
                  })}

                  {/* ACCESO A CAJERO AUTOMÁTICO */}
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      window.location.href = "/cajero";
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-[#111e38] hover:text-white transition-all border border-cyan-500/20 bg-cyan-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="h-4 w-4 text-cyan-400" />
                      <span>Cajero Automático ATM</span>
                    </div>
                    <span className="text-[9px] font-bold bg-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded-full">
                      ATM
                    </span>
                  </button>
                </div>

                {/* GRUPO 3: SEGURIDAD */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
                    Configuración
                  </p>
                  <button
                    onClick={() => selectTab("ajustes")}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      activeTab === "ajustes"
                        ? "bg-[#0e76fd] text-white shadow-md shadow-blue-600/30"
                        : "text-slate-300 hover:bg-[#111e38] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className={`h-4 w-4 ${activeTab === "ajustes" ? "text-white" : "text-[#38bdf8]"}`} />
                      <span>Ajustes & Seguridad</span>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* PIE DEL MENÚ LATERAL: CERRAR SESIÓN */}
            <div className="pt-4 mt-4 border-t border-[#14233e] space-y-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión segura</span>
              </button>
              <p className="text-[10px] text-center text-slate-500 font-mono">
                Banca Verde Móvil · v2.4.0
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL RADIAL RÁPIDO DEL BOTÓN "$" (ESTILO NEQUI)         */}
      {/* ======================================================== */}
      {showFabModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md p-4 lg:hidden animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#1d2f50] bg-[#0a1224] p-5 shadow-2xl space-y-4 text-center animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-display font-bold text-base text-white flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-r from-[#0e76fd] to-[#00d2ff] text-xs font-black text-white">
                  $
                </span>
                ¿Qué deseas hacer hoy?
              </span>
              <button
                onClick={() => setShowFabModal(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-left">
              <button
                onClick={() => {
                  setShowFabModal(false);
                  selectTab("transferencias");
                }}
                className="flex items-center gap-3 rounded-2xl border border-[#162544] bg-[#0c162b] hover:bg-[#122240] p-3 transition-all active:scale-95 group"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-[#38bdf8] group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Envía plata</p>
                  <p className="text-[10px] text-slate-400">A cualquier cuenta</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowFabModal(false);
                  selectTab("tarjetas");
                }}
                className="flex items-center gap-3 rounded-2xl border border-[#162544] bg-[#0c162b] hover:bg-[#122240] p-3 transition-all active:scale-95 group"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Paga en Datáfono</p>
                  <p className="text-[10px] text-slate-400">Contactless con PIN</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowFabModal(false);
                  window.location.href = "/cajero";
                }}
                className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-900/30 p-3 transition-all active:scale-95 group"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">Saca en Cajero</p>
                  <p className="text-[10px] text-slate-400">Terminal ATM</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowFabModal(false);
                  selectTab("ahorros");
                }}
                className="flex items-center gap-3 rounded-2xl border border-[#162544] bg-[#0c162b] hover:bg-[#122240] p-3 transition-all active:scale-95 group"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Ahorros y CDT</p>
                  <p className="text-[10px] text-slate-400">Metas y bolsillos</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BARRA DE NAVEGACIÓN MÓVIL EXACTA A NEQUI (IMAGEN 1)      */}
      {/* ======================================================== */}
      <div className="fixed inset-x-0 bottom-4 z-40 px-4 flex items-center justify-center gap-2.5 lg:hidden">
        {/* PÍLDORA DE NAVEGACIÓN PRINCIPAL */}
        <nav className="flex-1 max-w-[280px] flex items-center justify-around rounded-3xl border border-[#1a2d4e] bg-[#091122]/95 py-2.5 px-3 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => selectTab("inicio")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all ${
              activeTab === "inicio" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => selectTab("cuentas")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all ${
              activeTab === "cuentas" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Movimientos</span>
          </button>

          <button
            onClick={() => setShowMobileMore(true)}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all ${
              showMobileMore || ["ahorros", "prestamos", "ajustes"].includes(activeTab)
                ? "text-cyan-400 font-bold scale-105"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Menu className="h-4 w-4" />
            <span>Servicios</span>
          </button>
        </nav>

        {/* BOTÓN INSIGNIA "$" CUADRADO REDONDEADO DE NEQUI */}
        <button
          onClick={() => setShowFabModal(true)}
          aria-label="Operaciones rápidas"
          className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-[#0e76fd] to-[#00d2ff] hover:opacity-95 active:scale-95 text-white font-black text-xl shadow-lg shadow-blue-500/30 transition-all border border-cyan-300/40"
        >
          $
        </button>
      </div>
    </div>
  );
}
