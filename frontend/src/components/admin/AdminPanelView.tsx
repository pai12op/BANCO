import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/formatters";
import { authService } from "@/services/authService";
import { adminService } from "@/services/adminService";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, AdminTab } from "./AdminSidebar";
import { AdminLogin } from "./AdminLogin";
import { AdminClientesTable } from "./AdminClientesTable";
import { AdminConsignacionModal } from "./AdminConsignacionModal";
import { AdminCrearClienteModal } from "./AdminCrearClienteModal";
import { AdminAuditoriaTable } from "./AdminAuditoriaTable";
import { AdminVentanillaView } from "./AdminVentanillaView";
import {
  LayoutDashboard, Users, Wallet, History,
  UserPlus, Plus, Eye, EyeOff, Sparkles, X, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = formatCOP;

export function AdminPanelView() {
  const [autenticado, setAutenticado] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [mostrarBoveda, setMostrarBoveda] = useState(true);

  // KPIs
  const [kpis, setKpis] = useState({
    totalClientes: 0,
    cuentasActivas: 0,
    cuentasBloqueadas: 0,
    totalBoveda: 0,
  });

  // Clientes y Auditoría
  const [clientes, setClientes] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Búsqueda Asistida IA
  const [aiQuery, setAiQuery] = useState("");
  const [aiActiveFilter, setAiActiveFilter] = useState<string | null>(null);

  // Modales y preselección de ventanilla
  const [openCrearCliente, setOpenCrearCliente] = useState(false);
  const [openConsignar, setOpenConsignar] = useState(false);
  const [cuentaVentanilla, setCuentaVentanilla] = useState("");

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const data = await adminService.getDashboard();
      setKpis({
        totalClientes: Number(data.total_clientes) || 0,
        cuentasActivas: Number(data.cuentas_activas) || 0,
        cuentasBloqueadas: Number(data.cuentas_bloqueadas) || 0,
        totalBoveda: Number(data.saldo_total_banco) || 0,
      });
      setAutenticado(true);
      cargarClientes();
      cargarAuditoria();
    } catch {
      // Sin sesión admin activa
    }
  };

  const cargarDashboard = async () => {
    try {
      const data = await adminService.getDashboard();
      setKpis({
        totalClientes: Number(data.total_clientes) || 0,
        cuentasActivas: Number(data.cuentas_activas) || 0,
        cuentasBloqueadas: Number(data.cuentas_bloqueadas) || 0,
        totalBoveda: Number(data.saldo_total_banco) || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const cargarClientes = async () => {
    try {
      const data = await adminService.getClientes();
      setClientes(data.clientes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarAuditoria = async () => {
    try {
      const data = await adminService.getAuditoria();
      setAuditoria(data.movimientos || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEstadoCliente = async (cliente: any) => {
    const estadoActual =
      cliente.estado_cuenta ||
      cliente.estado ||
      cliente.estado_cliente ||
      (cliente.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
    const esActivo = estadoActual === "ACTIVO" || estadoActual === "ACTIVA";
    const nuevoEstadoId = esActivo ? 3 : 1;

    try {
      const data = await adminService.toggleEstadoCliente(cliente.id, nuevoEstadoId);
      toast.success(data.mensaje);
      cargarDashboard();
      cargarClientes();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cambiar el estado.");
    }
  };

  const handleConsignar = async (numero_cuenta: string, valorStr: string, concepto: string) => {
    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) {
      toast.error("El monto a consignar debe ser mayor a $0.");
      return null;
    }

    try {
      const data = await adminService.consignar(numero_cuenta.trim(), valor, concepto.trim());

      toast.success("Consignación exitosa", {
        description: `Depósito de ${fmt(valor)} aplicado a la cuenta ${numero_cuenta.trim()}.`,
      });
      cargarDashboard();
      cargarClientes();
      cargarAuditoria();
      return data.recibo;
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar consignación.");
      return null;
    }
  };

  const handleCrearCliente = async (nuevoCliente: any): Promise<boolean> => {
    try {
      const data = await adminService.crearCliente({
        tipo_documento_id: nuevoCliente.tipo_documento_id || 1,
        numero_documento: nuevoCliente.numero_documento.trim(),
        nombres: nuevoCliente.nombres.trim(),
        apellidos: nuevoCliente.apellidos.trim(),
        correo: nuevoCliente.correo.trim(),
        telefono: nuevoCliente.telefono ? nuevoCliente.telefono.trim() : null,
        password: nuevoCliente.password,
        pin_cajero: nuevoCliente.pin_cajero,
        tipo_cuenta_id: nuevoCliente.tipo_cuenta_id || 1,
        saldo_inicial: parseFloat(nuevoCliente.saldo_inicial) || 0,
      });

      toast.success("Cliente y cuenta creados con éxito", {
        description: data.cliente?.numero_cuenta
          ? `Cuenta asignada: ${data.cliente.numero_cuenta}`
          : undefined,
      });
      cargarDashboard();
      cargarClientes();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Error al crear cliente.");
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setAutenticado(false);
      toast.success("Sesión administrativa cerrada con éxito.");
    } catch (err) {
      console.error(err);
    }
  };

  // Motor de Búsqueda Asistida por Lenguaje Natural (IA)
  const aplicarFiltroIA = (consulta: string) => {
    const q = consulta.trim();
    if (!q) {
      setAiActiveFilter(null);
      return;
    }
    setAiQuery(q);
    setAiActiveFilter(q);
    toast.success(`Búsqueda asistida aplicada: "${q}"`);
  };

  const filtrarClientesPorIA = (lista: any[]) => {
    if (!aiActiveFilter) return lista;
    const q = aiActiveFilter.toLowerCase();

    const getEsActivo = (c: any) => {
      const est =
        c.estado_cuenta || c.estado || c.estado_cliente || (c.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
      return est === "ACTIVO" || est === "ACTIVA";
    };

    // Caso especial: "Saldo más bajo" o "menor saldo"
    if (q.includes("saldo más bajo") || q.includes("saldo mas bajo") || q.includes("menor saldo")) {
      if (lista.length === 0) return [];
      const ordenados = [...lista].sort((a, b) => Number(a.saldo || 0) - Number(b.saldo || 0));
      return ordenados.slice(0, 2);
    }

    // Caso especial: "Saldo más alto" o "mayor saldo"
    if (q.includes("saldo más alto") || q.includes("saldo mas alto") || q.includes("mayor saldo")) {
      if (lista.length === 0) return [];
      const ordenados = [...lista].sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0));
      return ordenados.slice(0, 2);
    }

    return lista.filter((c) => {
      const esActivo = getEsActivo(c);
      const saldo = Number(c.saldo || 0);
      const nombreCompleto = `${c.nombres || ""} ${c.apellidos || ""}`.toLowerCase();

      // Filtro por estado mencionado
      if ((q.includes("bloqueado") || q.includes("bloqueada") || q.includes("suspendid")) && esActivo) {
        return false;
      }
      if ((q.includes("activo") || q.includes("activa")) && !esActivo) {
        return false;
      }

      // Filtro por montos mencionados en lenguaje natural
      if (q.includes("más de un millón") || q.includes("mas de un millon") || q.includes("1 millón") || q.includes("1000000")) {
        if (saldo < 1000000) return false;
      } else if (q.includes("300 mil") || q.includes("300.000") || q.includes("300000")) {
        if (saldo < 300000) return false;
      } else if (q.includes("todavía tienen saldo") || q.includes("todavia tienen saldo") || q.includes("con saldo")) {
        if (saldo <= 0) return false;
      }

      // Filtro por apellido / nombre específico (ej: "Apellido Pai")
      if (q.includes("apellido ")) {
        const partes = q.split("apellido ");
        const apellidoBuscado = partes[1]?.trim().split(" ")[0];
        if (apellidoBuscado && !nombreCompleto.includes(apellidoBuscado)) {
          return false;
        }
      } else {
        // Si no es ninguna frase reservada, buscar coincidencias por palabras clave
        const palabrasReservadas = [
          "clientes", "cliente", "cuentas", "cuenta", "bloqueados", "bloqueadas",
          "bloqueado", "activos", "activas", "activo", "con", "mas", "más", "de",
          "un", "millon", "millón", "mil", "pesos", "que", "todavia", "todavía",
          "tienen", "saldo", "apellido"
        ];
        const tokens = q
          .replace(/[.,]/g, "")
          .split(/\s+/)
          .filter((t) => t.length > 2 && !palabrasReservadas.includes(t) && isNaN(Number(t)));

        for (const tk of tokens) {
          const match =
            nombreCompleto.includes(tk) ||
            (c.correo || "").toLowerCase().includes(tk) ||
            (c.numero_documento || "").includes(tk) ||
            (c.numero_cuenta || "").includes(tk);
          if (!match) return false;
        }
      }

      return true;
    });
  };

  if (!autenticado) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setAutenticado(true);
          cargarDashboard();
          cargarClientes();
          cargarAuditoria();
        }}
      />
    );
  }

  const totalCuentas = kpis.cuentasActivas + kpis.cuentasBloqueadas;
  const saludCartera = totalCuentas > 0 ? Math.round((kpis.cuentasActivas / totalCuentas) * 100) : 80;
  const clientesMostrados = filtrarClientesPorIA(clientes);

  // NAVEGACIÓN MÓVIL INFERIOR PARA ADMIN
  const mobileNavItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "ventanilla", label: "Ventanilla", icon: Wallet },
    { id: "auditoria", label: "Auditoría", icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#070b13] font-sans text-slate-100 flex flex-col">
      {/* SIDEBAR ADMIN DESKTOP */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(t) => {
          if (t === "nueva_cuenta") {
            setOpenCrearCliente(true);
          } else {
            setActiveTab(t);
          }
        }}
        onLogout={handleLogout}
      />

      {/* ÁREA CENTRAL CON PADDING IZQUIERDO EN DESKTOP */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AdminHeader
          autenticado={autenticado}
          onLogout={handleLogout}
          onRefresh={() => {
            cargarDashboard();
            cargarClientes();
            cargarAuditoria();
            toast.success("Datos administrativos sincronizados.");
          }}
        />

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-14 flex-1">
          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD EJECUTIVO (DISEÑO EXACTO A CAPTURA)     */}
          {/* ======================================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 1. TARJETA HERO: BÓVEDA TOTAL + 3 ACCESOS PRINCIPALES */}
              <section className="rounded-3xl border border-[#1b2c4d] bg-gradient-to-b from-[#0c172c] via-[#0a1324] to-[#08101e] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen opacity-60" />

                <div className="relative text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <span>Bóveda total</span>
                    <button
                      type="button"
                      onClick={() => setMostrarBoveda(!mostrarBoveda)}
                      className="text-slate-400 hover:text-white transition-colors p-0.5"
                      title={mostrarBoveda ? "Ocultar saldo en bóveda" : "Mostrar saldo en bóveda"}
                    >
                      {mostrarBoveda ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white mt-1.5">
                    {mostrarBoveda ? fmt(kpis.totalBoveda) : "$ ••••••••"}
                  </h2>

                  <p className="text-xs text-slate-400 mt-2">
                    Clientes{" "}
                    <span className="font-mono font-bold text-cyan-400">
                      {String(kpis.totalClientes).padStart(2, "0")}
                    </span>{" "}
                    · Saldo en custodia
                  </p>

                  {/* 3 BOTONES CENTRALES DENTRO DE LA BÓVEDA */}
                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* ACCIÓN 1: VENTANILLA */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("ventanilla")}
                      className="rounded-2xl border border-[#1e3154] bg-[#0d1930]/80 hover:bg-[#132444] hover:border-blue-500/40 p-4 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 group-hover:scale-105 transition-transform">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        Ventanilla
                      </span>
                    </button>

                    {/* ACCIÓN 2: NUEVA CUENTA */}
                    <button
                      type="button"
                      onClick={() => setOpenCrearCliente(true)}
                      className="rounded-2xl border border-[#1e3154] bg-[#0d1930]/80 hover:bg-[#132444] hover:border-blue-500/40 p-4 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 group-hover:scale-105 transition-transform">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        Nueva cuenta
                      </span>
                    </button>

                    {/* ACCIÓN 3: AUDITORÍA */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("auditoria")}
                      className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0b2637]/90 to-[#081c2b]/90 hover:from-[#0f3248] hover:to-[#0b2538] p-4 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
                        <History className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
                        Auditoría
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              {/* 2. FILA CENTRAL: BÚSQUEDA ASISTIDA IA + RESUMEN DE CARTERA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* COLUMNA IZQUIERDA (7 cols): BÚSQUEDA ASISTIDA IA */}
                <section className="lg:col-span-7 rounded-3xl border border-[#1b2c4d] bg-[#0a1324] p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Búsqueda asistida</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        IA
                      </span>
                    </div>

                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-2">
                      ¿A quién necesitas encontrar?
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Descríbelo en tus palabras y la IA revisará los registros de clientes.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        aplicarFiltroIA(aiQuery);
                      }}
                      className="mt-4 flex items-center gap-2 rounded-2xl border border-[#1e3154] bg-[#070d19] p-1.5 pl-4 focus-within:border-blue-500/50 transition-colors"
                    >
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="Ej: clientes bloqueados con más de 300 mil pesos"
                        className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none"
                      />
                      {aiActiveFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiQuery("");
                            setAiActiveFilter(null);
                          }}
                          className="text-slate-400 hover:text-white p-1"
                          title="Limpiar búsqueda IA"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0e76fd] hover:bg-[#0b63d6] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all shrink-0"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Buscar</span>
                      </button>
                    </form>
                  </div>

                  {/* PÍLDORAS DE SUGERENCIA RÁPIDA */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Bloqueados que todavía tienen saldo",
                      "Activos con más de un millón",
                      "Apellido Pai",
                      "Saldo más bajo",
                    ].map((sug) => {
                      const activa = aiActiveFilter === sug;
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (activa) {
                              setAiQuery("");
                              setAiActiveFilter(null);
                            } else {
                              aplicarFiltroIA(sug);
                            }
                          }}
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                            activa
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                              : "border-[#1e3154] bg-[#0d172b] text-slate-300 hover:border-blue-500/40 hover:text-white"
                          }`}
                        >
                          {sug}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* COLUMNA DERECHA (5 cols): RESUMEN DE CARTERA */}
                <section className="lg:col-span-5 rounded-3xl border border-[#1b2c4d] bg-[#0a1324] p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-white">Resumen de Cartera</h3>
                      <span className="rounded-full border border-[#223558] bg-[#0e192d] px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                        Hoy
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Estado de cuentas · Noviembre de 2026</p>

                    {/* TOTAL CLIENTES */}
                    <div className="mt-4 rounded-2xl border border-[#1b2c4d] bg-[#0d172b] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span>Total clientes</span>
                      </div>
                      <span className="font-mono text-xl font-bold text-white">
                        {String(kpis.totalClientes).padStart(2, "0")}
                      </span>
                    </div>

                    {/* ACTIVAS VS BLOQUEADAS */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl border border-[#1b2c4d] bg-[#0d172b] p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>Activas</span>
                        </div>
                        <p className="font-mono text-2xl font-bold text-emerald-400 mt-1">
                          {String(kpis.cuentasActivas).padStart(2, "0")}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#1b2c4d] bg-[#0d172b] p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          <span>Bloqueadas</span>
                        </div>
                        <p className="font-mono text-2xl font-bold text-white mt-1">
                          {String(kpis.cuentasBloqueadas).padStart(2, "0")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE SALUD DE CARTERA */}
                  <div className="mt-4 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Salud de cartera</span>
                      <span className="font-bold text-emerald-400">{saludCartera}% activas</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-rose-500/80 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${saludCartera}%` }}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* 3. TABLA DE CLIENTES RECIENTES */}
              <AdminClientesTable
                clientes={clientesMostrados}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onToggleEstado={toggleEstadoCliente}
                onRefresh={() => {
                  cargarDashboard();
                  cargarClientes();
                  toast.success("Listado de clientes actualizado.");
                }}
                onQuickConsignar={(cli) => {
                  setCuentaVentanilla(cli.numero_cuenta);
                  setActiveTab("ventanilla");
                }}
                aiFilterLabel={aiActiveFilter}
                onClearAiFilter={() => {
                  setAiQuery("");
                  setAiActiveFilter(null);
                }}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DIRECTORIO COMPLETO DE CLIENTES                   */}
          {/* ======================================================== */}
          {activeTab === "clientes" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#142038] pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">Directorio de Clientes</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Búsqueda, control de estados (Activa / Bloqueada), apertura y consulta de saldos en custodia.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e3154] bg-[#0b1528] hover:bg-[#132342] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </button>
                  <Button
                    onClick={() => setOpenCrearCliente(true)}
                    className="gap-1.5 rounded-xl bg-[#0e76fd] hover:bg-[#0b63d6] text-white font-semibold text-xs shadow-md shadow-blue-600/25"
                  >
                    <Plus className="h-4 w-4" /> Nueva Cuenta
                  </Button>
                </div>
              </div>

              <AdminClientesTable
                title="Todos los Clientes Registrados"
                clientes={clientes}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onToggleEstado={toggleEstadoCliente}
                onRefresh={cargarClientes}
                onQuickConsignar={(cli) => {
                  setCuentaVentanilla(cli.numero_cuenta);
                  setActiveTab("ventanilla");
                }}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: VENTANILLA DE CAJA                                */}
          {/* ======================================================== */}
          {activeTab === "ventanilla" && (
            <AdminVentanillaView
              onConsignar={handleConsignar}
              clientes={clientes}
              cuentaPreseleccionada={cuentaVentanilla}
              onVolverDashboard={() => setActiveTab("dashboard")}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 4: AUDITORÍA GLOBAL                                  */}
          {/* ======================================================== */}
          {activeTab === "auditoria" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#142038] pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Libro de Auditoría y Movimientos
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trazabilidad inmutable de todas las operaciones realizadas por Cajero ATM, Banca Web y Ventanilla.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e3154] bg-[#0b1528] hover:bg-[#132342] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver al Dashboard</span>
                </button>
              </div>

              <AdminAuditoriaTable auditoria={auditoria} onRefresh={cargarAuditoria} />
            </div>
          )}
        </main>
      </div>

      {/* BARRA INFERIOR MÓVIL */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#141f35] bg-[#070b13]/95 backdrop-blur-lg px-2 py-2 lg:hidden">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-[#0e76fd] font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODAL CREAR CLIENTE */}
      <AdminCrearClienteModal
        open={openCrearCliente}
        onOpenChange={setOpenCrearCliente}
        onCrearCliente={handleCrearCliente}
      />

      {/* MODAL CONSIGNAR (RÁPIDO) */}
      <AdminConsignacionModal
        open={openConsignar}
        onOpenChange={setOpenConsignar}
        onConsignar={handleConsignar}
      />
    </div>
  );
}
