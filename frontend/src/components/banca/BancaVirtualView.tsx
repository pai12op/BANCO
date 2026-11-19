import { useState, useEffect } from "react";
import { toast } from "sonner";
import { securePost, saveCajeroHandoff } from "@/lib/secureFetch";
import { BancaTab, Cuenta, Movimiento, Usuario } from "./types";
import { BancaSidebar } from "./BancaSidebar";
import { BancaHeader, BankNotification } from "./BancaHeader";
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
  Menu, ChevronRight, ShieldCheck, DollarSign, FileText, Copy, Check
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

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
  const [showModalSacarPlata, setShowModalSacarPlata] = useState(false);
  const [codigoRetiro, setCodigoRetiro] = useState<string | null>(null);
  const [loadingCodigo, setLoadingCodigo] = useState(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);
  const [notificaciones, setNotificaciones] = useState<BankNotification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const agregarNotificacion = (title: string, detail: string) => {
    const item: BankNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      detail,
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    };
    setNotificaciones((prev) => [item, ...prev].slice(0, 20));
    setUnreadNotifs((prev) => prev + 1);
  };

  // Cargar datos de resumen desde el núcleo bancario
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
      const res = await securePost("/api/auth/login-cliente", {
        identificador,
        password: pass,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales incorrectas.");
        return;
      }
      toast.success("Inicio de sesión exitoso", {
        description: `Bienvenido(a), ${data.usuario.nombres}`,
      });
      agregarNotificacion(
        "Sesión iniciada con éxito",
        `Acceso cifrado aprobado para ${data.usuario.nombres} ${data.usuario.apellidos}.`
      );
      cargarResumen();
    } catch (err: any) {
      toast.error(err?.message || "Error de conexión segura al iniciar sesión.");
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
      setNotificaciones([]);
      setUnreadNotifs(0);
      setActiveTab("inicio");
      setShowMobileMore(false);
      toast.success("Sesión cerrada correctamente.");
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
      agregarNotificacion("Contacto actualizado", `Nuevo teléfono registrado: ${nuevoTel}.`);
      return true;
    } catch (err) {
      toast.error("Error de comunicación.");
      return false;
    }
  };

  const handleCambiarPassword = async (
    passAct: string,
    passNew: string,
    passConfirm: string,
    pinCajero: string
  ): Promise<boolean> => {
    try {
      const res = await securePost("/api/banca/password", {
        password_actual: passAct,
        password_nuevo: passNew,
        password_confirmacion: passConfirm,
        pin_cajero: pinCajero,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar contraseña.");
        return false;
      }
      agregarNotificacion(
        "Contraseña actualizada con éxito",
        "Cambio autenticado con clave actual + PIN de 4 dígitos y sesión renovada."
      );
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Error de comunicación segura.");
      return false;
    }
  };

  const saldoReal = cuentaActiva ? cuentaActiva.saldo : 0;

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

  const handleGenerarCodigoRetiro = async () => {
    try {
      setLoadingCodigo(true);
      setShowModalSacarPlata(true);
      const res = await fetch("/api/banca/generar-codigo-retiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuenta_id: cuentaActiva?.id,
          numero_cuenta: cuentaActiva?.numero_cuenta
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.codigo) {
        setCodigoRetiro(data.codigo);
        toast.success("Código de retiro generado", {
          description: `Tu código temporal es ${data.codigo}.`,
        });
        agregarNotificacion(
          "Código de retiro ATM generado",
          `Código temporal ${data.codigo} listo para usar en el cajero automático.`
        );
      } else {
        if (res.status === 401) {
          setShowModalSacarPlata(false);
          toast.error("Sesión expirada. Por favor inicie sesión nuevamente.");
          setUsuario(null);
        } else {
          toast.error(data.error || "No se pudo generar el código de retiro.");
        }
      }
    } catch (err) {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoadingCodigo(false);
    }
  };

  // Función universal para copiar al portapapeles (compatible con HTTP local y móviles)
  const copiarTexto = async (texto: string, tipo: "codigo" | "cuenta") => {
    if (!texto) return;
    let copiado = false;

    // 1. Intentar API moderna de Clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(texto);
        copiado = true;
      } catch (e) {
        // Fallback abajo
      }
    }

    // 2. Fallback para HTTP en red local (Android / iOS / PC)
    if (!copiado && typeof document !== "undefined") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copiado = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch (err) {
        console.error("Error en fallback de copiado:", err);
      }
    }

    if (tipo === "codigo") {
      setCopiadoCodigo(true);
      setTimeout(() => setCopiadoCodigo(false), 3000);
      toast.success("¡Código copiado al portapapeles!", {
        description: `Código: ${texto}`,
      });
    } else {
      setCopiadoCuenta(true);
      setTimeout(() => setCopiadoCuenta(false), 3000);
      toast.success("¡Número de cuenta copiado!", {
        description: `Cuenta: ${texto}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] font-sans text-slate-100 w-full max-w-full overflow-x-clip">
      {/* SIDEBAR DESKTOP PERMANENTE */}
      <BancaSidebar
        activeTab={activeTab}
        onSelectTab={selectTab}
        onLogout={handleLogout}
      />

      {/* ÁREA CENTRAL CON PADDING IZQUIERDO EN DESKTOP */}
      <div className="lg:pl-64 flex flex-col min-h-screen w-full max-w-full overflow-x-clip">
        {/* HEADER LIMPIO */}
        <BancaHeader
          usuario={usuario}
          onRefresh={() => {
            cargarResumen();
            toast.success("Saldos y movimientos actualizados.");
          }}
          onLogout={handleLogout}
          onToggleMenu={() => setShowMobileMore((prev) => !prev)}
          notifications={notificaciones}
          unreadCount={unreadNotifs}
          onMarkNotificationsRead={() => setUnreadNotifs(0)}
        />

        {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
        <main className="mx-auto w-full max-w-6xl px-3 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-3.5 sm:pt-6 flex-1">
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
              onOpenSacarPlata={handleGenerarCodigoRetiro}
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
                toast.success("Cuenta seleccionada", {
                  description: `${c.tipo_cuenta || "Cuenta"} ${c.numero_cuenta}`,
                });
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
              onNotify={agregarNotificacion}
            />
          )}

          {activeTab === "tarjetas" && (
            <TarjetasView
              usuario={usuario}
              cuentaActiva={cuentaActiva}
              onRefreshResumen={cargarResumen}
              onNotify={agregarNotificacion}
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
                    {usuario ? `${usuario.nombres[0]}${usuario.apellidos[0]}`.toUpperCase() : "CB"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-white truncate leading-tight">
                      {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Cliente Bancario"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {usuario?.tipo_documento || "C.C."} {usuario?.numero_documento || "----------"}
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

                  {/* ACCESO A CAJERO AUTOMÁTICO - SACAR PLATA */}
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      handleGenerarCodigoRetiro();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-[#111e38] hover:text-white transition-all border border-cyan-500/20 bg-cyan-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <Landmark className="h-4 w-4 text-cyan-400" />
                      <span>Sacar Dinero (Código Cajero)</span>
                    </div>
                    <span className="text-[9px] font-bold bg-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded-full">
                      CÓDIGO
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

                {/* GRUPO 4: OTROS CANALES */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
                    Otros Canales
                  </p>
                  <a
                    href="/cajero"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-[#111e38] transition-all border border-cyan-500/20 bg-cyan-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-cyan-400" />
                      <span>Cajero Automático ATM</span>
                    </div>
                  </a>
                  <a
                    href="/admin"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-purple-300 hover:bg-[#111e38] transition-all border border-purple-500/20 bg-purple-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      <span>Consola Administrativa</span>
                    </div>
                  </a>
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
                Banca Rota Móvil · v2.4.0
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODERNO: SACAR DINERO EN CAJERO CON CÓDIGO OTP */}
      {showModalSacarPlata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#1d2f50] bg-[#091224] p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-200">
            {/* ENCABEZADO MODAL */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white leading-tight">
                    Sacar Dinero en Cajero
                  </h3>
                  <p className="text-[11px] text-slate-400">Retiro sin tarjeta con código único</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalSacarPlata(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingCodigo ? (
              <div className="py-8 text-center space-y-2">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <p className="text-xs text-slate-400">Generando tu código de retiro seguro...</p>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                {/* CAJA DESTACADA DEL CÓDIGO */}
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0b1b36] to-[#071122] p-4 text-center space-y-2.5 shadow-inner">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    Tu Código de Retiro (Válido 30 min)
                  </p>

                  <div className="flex items-center justify-center gap-3">
                    <p
                      onClick={() => copiarTexto(codigoRetiro || "", "codigo")}
                      title="Haz clic para copiar"
                      className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white cursor-pointer hover:text-cyan-300 transition-colors select-all"
                    >
                      {codigoRetiro ? `${codigoRetiro.slice(0, 3)} ${codigoRetiro.slice(3)}` : "------"}
                    </p>

                    <button
                      type="button"
                      onClick={() => copiarTexto(codigoRetiro || "", "codigo")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md ${
                        copiadoCodigo
                          ? "bg-emerald-500 text-slate-950 shadow-emerald-500/40 scale-105"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-blue-500/25"
                      }`}
                      title="Copiar código de retiro"
                    >
                      {copiadoCodigo ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* MENSAJE DE CONFIRMACIÓN VISUAL DESTACADO */}
                  {copiadoCodigo ? (
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/50 py-1.5 px-3 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>¡Código copiado al portapapeles!</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-400 font-medium">
                      ● Código activo de un solo uso en Cajeros ATM
                    </p>
                  )}
                </div>

                {/* DETALLE DE CUENTA */}
                <div className="rounded-xl border border-slate-800 bg-[#060b14] p-3 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Número de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {cuentaActiva?.numero_cuenta || "400150181053"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(cuentaActiva?.numero_cuenta || "400150181053", "cuenta")}
                        className={`grid h-6 w-6 place-items-center rounded-md text-[10px] transition-all ${
                          copiadoCuenta
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                        title="Copiar número de cuenta"
                      >
                        {copiadoCuenta ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Saldo Disponible:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {fmt(saldoReal)}
                    </span>
                  </div>
                </div>

                {/* PASOS DE INSTRUCCIÓN */}
                <div className="rounded-xl bg-slate-900/60 p-3 space-y-1 text-slate-300 text-[11px]">
                  <p className="font-bold text-white mb-0.5">¿Cómo retirar en el Cajero?</p>
                  <p>1. Ingresa a la pantalla del Cajero Virtual.</p>
                  <p>2. Ingresa tu número de cuenta: <span className="font-mono font-bold text-cyan-300">{cuentaActiva?.numero_cuenta || "Tu cuenta"}</span></p>
                  <p>3. Digita tu código generado: <span className="font-mono font-bold text-cyan-300">{codigoRetiro}</span></p>
                </div>

                {/* BOTÓN PARA ENTRAR DIRECTO AL CAJERO SIN EXPONER DATOS EN URL */}
                <button
                  disabled={loadingCodigo || !codigoRetiro || codigoRetiro === "null"}
                  onClick={() => {
                    if (!codigoRetiro || codigoRetiro === "null" || !cuentaActiva?.numero_cuenta) {
                      toast.error("El código de retiro aún no ha sido generado.");
                      return;
                    }
                    saveCajeroHandoff(cuentaActiva.numero_cuenta, codigoRetiro);
                    window.location.href = "/cajero";
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0e76fd] to-[#00d2ff] hover:opacity-95 active:scale-95 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Landmark className="h-4 w-4" />
                  <span>Entrar al Cajero Virtual con este Código →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
