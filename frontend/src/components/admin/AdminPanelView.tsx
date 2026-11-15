import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, AdminTab } from "./AdminSidebar";
import { AdminLogin } from "./AdminLogin";
import { AdminKpis } from "./AdminKpis";
import { AdminClientesTable } from "./AdminClientesTable";
import { AdminConsignacionModal } from "./AdminConsignacionModal";
import { AdminCrearClienteModal } from "./AdminCrearClienteModal";
import { AdminAuditoriaTable } from "./AdminAuditoriaTable";
import { AdminVentanillaView } from "./AdminVentanillaView";
import {
  LayoutDashboard, Users, DollarSign, History,
  UserPlus, Plus, ShieldCheck, RefreshCw, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminPanelView() {
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

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

  // Modales
  const [openCrearCliente, setOpenCrearCliente] = useState(false);
  const [openConsignar, setOpenConsignar] = useState(false);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKpis({
          totalClientes: Number(data.total_clientes) || 0,
          cuentasActivas: Number(data.cuentas_activas) || 0,
          cuentasBloqueadas: Number(data.cuentas_bloqueadas) || 0,
          totalBoveda: Number(data.saldo_total_banco) || 0,
        });
        setAutenticado(true);
        cargarClientes();
        cargarAuditoria();
      }
    } catch (err) {
      // Sin sesión admin
    }
  };

  const handleLogin = async (correo: string, pass: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), password: pass }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales de administrador inválidas.");
        return;
      }

      toast.success("Bienvenido Administrador");
      setAutenticado(true);
      cargarDashboard();
      cargarClientes();
      cargarAuditoria();
    } catch (err) {
      toast.error("Error de conexión con la consola administrativa.");
    } finally {
      setLoading(false);
    }
  };

  const cargarDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKpis({
          totalClientes: Number(data.total_clientes) || 0,
          cuentasActivas: Number(data.cuentas_activas) || 0,
          cuentasBloqueadas: Number(data.cuentas_bloqueadas) || 0,
          totalBoveda: Number(data.saldo_total_banco) || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/admin/clientes", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cargarAuditoria = async () => {
    try {
      const res = await fetch("/api/admin/movimientos-general", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuditoria(data.movimientos || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEstadoCliente = async (cliente: any) => {
    const estadoActual = cliente.estado || cliente.estado_cliente || (cliente.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
    const nuevoEstadoId = estadoActual === "ACTIVO" ? 3 : 1;
    try {
      const res = await fetch("/api/admin/clientes/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: cliente.id, nuevo_estado_id: nuevoEstadoId }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo cambiar el estado.");
        return;
      }

      toast.success(data.mensaje);
      cargarDashboard();
      cargarClientes();
    } catch (err) {
      toast.error("Error al actualizar estado.");
    }
  };

  const handleConsignar = async (numero_cuenta: string, valorStr: string, concepto: string) => {
    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) {
      toast.error("El monto a consignar debe ser mayor a $0.");
      return null;
    }

    try {
      const res = await fetch("/api/admin/consignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_cuenta: numero_cuenta.trim(),
          valor,
          concepto: concepto.trim(),
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al procesar consignación.");
        return null;
      }

      cargarDashboard();
      cargarClientes();
      cargarAuditoria();
      return data.recibo;
    } catch (err) {
      toast.error("Error al conectar con ventanilla.");
      return null;
    }
  };

  const handleCrearCliente = async (nuevoCliente: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear cliente.");
        return false;
      }

      toast.success("Cliente y cuenta creados exitosamente con cifrado seguro.");
      cargarDashboard();
      cargarClientes();
      setActiveTab("clientes");
      return true;
    } catch (err) {
      toast.error("Error de comunicación.");
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setAutenticado(false);
      toast.info("Sesión administrativa finalizada.");
    } catch (err) {
      console.error(err);
    }
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

  // NAVEGACIÓN MÓVIL INFERIOR PARA ADMIN
  const mobileNavItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "ventanilla", label: "Ventanilla", icon: DollarSign },
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
            toast.success("Datos administrativos actualizados.");
          }}
        />

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 flex-1">
          {/* TAB 1: DASHBOARD Y KPIS */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">Dashboard Central</h2>
                  <p className="text-xs text-slate-400">
                    4 Indicadores normativos de control financiero y solvencia en bóveda.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab("ventanilla")}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25"
                  >
                    <DollarSign className="h-4 w-4" /> Ventanilla
                  </Button>
                  <Button
                    onClick={() => setOpenCrearCliente(true)}
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25"
                  >
                    <Plus className="h-4 w-4" /> Nueva Cuenta
                  </Button>
                </div>
              </div>

              {/* 4 KPIS OBLIGATORIOS (PÁG 3 PDF) */}
              <AdminKpis kpis={kpis} />

              {/* VISTA RÁPIDA DE CLIENTES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">Clientes Recientes</h3>
                  <button
                    onClick={() => setActiveTab("clientes")}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Ver todos los clientes →
                  </button>
                </div>
                <AdminClientesTable
                  clientes={clientes.slice(0, 5)}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onToggleEstado={toggleEstadoCliente}
                />
              </div>

              {/* VISTA RÁPIDA DE AUDITORÍA */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">Últimas Transacciones del Banco</h3>
                  <button
                    onClick={() => setActiveTab("auditoria")}
                    className="text-xs text-purple-400 hover:underline font-semibold"
                  >
                    Ver libro de auditoría completo →
                  </button>
                </div>
                <AdminAuditoriaTable
                  auditoria={auditoria.slice(0, 8)}
                  onRefresh={cargarAuditoria}
                />
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTES */}
          {activeTab === "clientes" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">Directorio de Clientes</h2>
                  <p className="text-xs text-slate-400">
                    Búsqueda, control de estados (Activo, Inactivo, Bloqueado) y consulta de saldos.
                  </p>
                </div>
                <Button
                  onClick={() => setOpenCrearCliente(true)}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25"
                >
                  <Plus className="h-4 w-4" /> Registrar Cliente
                </Button>
              </div>

              <AdminClientesTable
                clientes={clientes}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onToggleEstado={toggleEstadoCliente}
              />
            </div>
          )}

          {/* TAB 3: VENTANILLA DE CAJA */}
          {activeTab === "ventanilla" && (
            <AdminVentanillaView onConsignar={handleConsignar} />
          )}

          {/* TAB 4: AUDITORÍA GLOBAL */}
          {activeTab === "auditoria" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="font-display text-2xl font-bold text-white">Libro de Auditoría y Movimientos</h2>
                <p className="text-xs text-slate-400">
                  Trazabilidad inmutable de todas las operaciones realizadas por Cajero ATM, Banca Web y Ventanilla.
                </p>
              </div>

              <AdminAuditoriaTable
                auditoria={auditoria}
                onRefresh={cargarAuditoria}
              />
            </div>
          )}
        </main>
      </div>

      {/* BARRA INFERIOR MÓVIL EXACTA AL PANEL DE USUARIOS */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#1a2333] bg-[#070b13]/95 backdrop-blur-lg px-2 py-2 lg:hidden">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-purple-400 font-bold" : "text-slate-400 hover:text-slate-200"
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
