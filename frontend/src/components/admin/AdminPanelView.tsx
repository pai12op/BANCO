import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "./AdminHeader";
import { AdminLogin } from "./AdminLogin";
import { AdminKpis } from "./AdminKpis";
import { AdminClientesTable } from "./AdminClientesTable";
import { AdminConsignacionModal } from "./AdminConsignacionModal";
import { AdminCrearClienteModal } from "./AdminCrearClienteModal";
import { AdminAuditoriaTable } from "./AdminAuditoriaTable";

export function AdminPanelView() {
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState({
    totalClientes: 0,
    cuentasActivas: 0,
    cuentasBloqueadas: 0,
    totalBoveda: 0,
  });

  // Clientes y Movimientos
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
      toast.error("Error de conexión.");
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

      toast.success("¡Consignación aplicada con éxito!");
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
          ...nuevoCliente,
          saldo_inicial: parseFloat(nuevoCliente.saldo_inicial) || 0,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear cliente.");
        return false;
      }

      toast.success("Cliente y cuenta creados exitosamente.");
      cargarDashboard();
      cargarClientes();
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
      toast.info("Sesión administrativa cerrada.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-53px)] bg-background font-sans text-foreground">
      {/* HEADER ADMIN */}
      <AdminHeader autenticado={autenticado} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {!autenticado ? (
          <AdminLogin onLogin={handleLogin} loading={loading} />
        ) : (
          <div className="space-y-6">
            {/* 4 KPIS OBLIGATORIOS */}
            <AdminKpis kpis={kpis} />

            {/* ACCIONES RÁPIDAS: VENTANILLA Y NUEVO CLIENTE */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
              <div>
                <h3 className="font-display text-lg font-bold">Ventanilla Bancaria</h3>
                <p className="text-xs text-muted-foreground">
                  Aplica depósitos presenciales y crea nuevas cuentas
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setOpenConsignar(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  <DollarSign className="h-4 w-4" /> Consignar en Ventanilla
                </Button>

                <Button
                  onClick={() => setOpenCrearCliente(true)}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                >
                  <Plus className="h-4 w-4" /> Nuevo Cliente
                </Button>
              </div>
            </div>

            {/* TABLA DE CLIENTES Y CONTROL DE BLOQUEO */}
            <AdminClientesTable
              clientes={clientes}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onToggleEstado={toggleEstadoCliente}
            />

            {/* TABLA DE AUDITORÍA GENERAL */}
            <AdminAuditoriaTable
              auditoria={auditoria}
              onRefresh={cargarAuditoria}
            />
          </div>
        )}
      </main>

      {/* MODAL CONSIGNAR */}
      <AdminConsignacionModal
        open={openConsignar}
        onOpenChange={setOpenConsignar}
        onConsignar={handleConsignar}
      />

      {/* MODAL CREAR CLIENTE */}
      <AdminCrearClienteModal
        open={openCrearCliente}
        onOpenChange={setOpenCrearCliente}
        onCrearCliente={handleCrearCliente}
      />
    </div>
  );
}
