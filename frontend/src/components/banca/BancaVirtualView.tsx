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
  PiggyBank, Landmark, Settings, MoreHorizontal, LogOut, X
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

  // SI NO HAY USUARIO AUTENTICADO: LOGIN LIMPIO Y AISLADO
  if (!usuario && !loading) {
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

      {/* MODAL / DRAWER FLOTANTE DE OPCIONES ADICIONALES PARA MÓVIL (MÁS) */}
      {showMobileMore && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-3xl border-t border-[#1a273f] bg-[#0c1322] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#182338]">
              <span className="font-display font-bold text-base text-white">Más opciones</span>
              <button
                onClick={() => setShowMobileMore(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => selectTab("ahorros")}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 border transition-all ${
                  activeTab === "ahorros"
                    ? "bg-[#0e76fd]/20 border-[#0e76fd] text-white"
                    : "bg-[#080d19] border-[#182338] text-slate-300 hover:text-white"
                }`}
              >
                <PiggyBank className="h-6 w-6 text-[#38bdf8]" />
                <span className="text-xs font-semibold">Ahorros y CDT</span>
              </button>

              <button
                onClick={() => selectTab("prestamos")}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 border transition-all ${
                  activeTab === "prestamos"
                    ? "bg-[#0e76fd]/20 border-[#0e76fd] text-white"
                    : "bg-[#080d19] border-[#182338] text-slate-300 hover:text-white"
                }`}
              >
                <Landmark className="h-6 w-6 text-[#38bdf8]" />
                <span className="text-xs font-semibold">Préstamos</span>
              </button>

              <button
                onClick={() => selectTab("ajustes")}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 border transition-all ${
                  activeTab === "ajustes"
                    ? "bg-[#0e76fd]/20 border-[#0e76fd] text-white"
                    : "bg-[#080d19] border-[#182338] text-slate-300 hover:text-white"
                }`}
              >
                <Settings className="h-6 w-6 text-[#38bdf8]" />
                <span className="text-xs font-semibold">Ajustes / Perfil</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileMore(false);
                  window.location.href = "/cajero";
                }}
                className="flex flex-col items-center gap-2 rounded-2xl p-4 border border-[#182338] bg-[#080d19] text-cyan-300 hover:text-white transition-all"
              >
                <CreditCard className="h-6 w-6" />
                <span className="text-xs font-semibold">Cajero ATM</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN MÓVIL EXACTA A LA IMAGEN 3 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[#152033] bg-[#070b13]/95 py-2.5 backdrop-blur-lg lg:hidden">
        {mobileNavItems.map((n) => {
          const isActive = activeTab === n.id;
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => selectTab(n.id)}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-[#0e76fd] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{n.label}</span>
            </button>
          );
        })}

        {/* BOTÓN MÁS CON LOS 3 PUNTOS DE LA IMAGEN 3 */}
        <button
          onClick={() => setShowMobileMore(!showMobileMore)}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            showMobileMore || ["ahorros", "prestamos", "ajustes"].includes(activeTab)
              ? "text-[#0e76fd] font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
