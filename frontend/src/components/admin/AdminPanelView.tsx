import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Landmark, Receipt, Users, CreditCard, Lock, Unlock,
  Plus, Search, RefreshCw, LogOut, CheckCircle2, AlertTriangle, FileText,
  DollarSign, ArrowDownLeft, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminPanelProps {
  activeModule?: string;
  onSwitchModule?: (mod: string) => void;
}

export function AdminPanelView({ activeModule = "admin", onSwitchModule }: AdminPanelProps) {
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
  const [reciboConsignacion, setReciboConsignacion] = useState<any>(null);

  // Form Login Admin
  const [adminCorreo, setAdminCorreo] = useState("admin@banco.com");
  const [adminPassword, setAdminPassword] = useState("Banco123*");

  // Form Consignar
  const [cuentaConsignar, setCuentaConsignar] = useState("400110203040");
  const [montoConsignar, setMontoConsignar] = useState("100000");
  const [conceptoConsignar, setConceptoConsignar] = useState("Consignación de prueba académica");
  const [consignarLoading, setConsignarLoading] = useState(false);

  // Form Crear Cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo_documento_id: 1,
    numero_documento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    saldo_inicial: "100000",
  });
  const [crearLoading, setCrearLoading] = useState(false);

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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: adminCorreo.trim(), password: adminPassword }),
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
    const nuevoEstadoId = estadoActual === "ACTIVO" ? 3 : 1; // 3: BLOQUEADO, 1: ACTIVO
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

  const handleConsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(montoConsignar);
    if (isNaN(valor) || valor <= 0) {
      toast.error("El monto a consignar debe ser mayor a $0.");
      return;
    }

    try {
      setConsignarLoading(true);
      const res = await fetch("/api/admin/consignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_cuenta: cuentaConsignar.trim(),
          valor,
          concepto: conceptoConsignar.trim(),
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al procesar consignación.");
        return;
      }

      toast.success("¡Consignación aplicada con éxito!");
      setReciboConsignacion(data.recibo);
      setOpenConsignar(false);
      cargarDashboard();
      cargarClientes();
      cargarAuditoria();
    } catch (err) {
      toast.error("Error al conectar con ventanilla.");
    } finally {
      setConsignarLoading(false);
    }
  };

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCrearLoading(true);
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
        return;
      }

      toast.success("Cliente y cuenta creados exitosamente.");
      setOpenCrearCliente(false);
      setNuevoCliente({
        tipo_documento_id: 1,
        numero_documento: "",
        nombres: "",
        apellidos: "",
        correo: "",
        telefono: "",
        saldo_inicial: "100000",
      });
      cargarDashboard();
      cargarClientes();
    } catch (err) {
      toast.error("Error de comunicación.");
    } finally {
      setCrearLoading(false);
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

  const clientesFiltrados = clientes.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombres?.toLowerCase().includes(term) ||
      c.apellidos?.toLowerCase().includes(term) ||
      c.numero_documento?.includes(term) ||
      c.numero_cuenta?.includes(term)
    );
  });

  return (
    <div className="min-h-[calc(100vh-53px)] bg-background font-sans text-foreground">
      {/* HEADER ADMIN LIMPIO Y ESPACIOSO */}
      <header className="border-b bg-background/80 backdrop-blur px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight text-foreground">Consola Administrativa</h1>
              <p className="text-xs text-muted-foreground">Bóveda, Ventanilla y Gestión de Clientes · Rol: Administrador</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors"
            >
              ← Ir a Portal Clientes
            </a>
            {autenticado && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-9"
              >
                <LogOut className="h-3.5 w-3.5" /> Salir de Consola
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {!autenticado ? (
          /* LOGIN ADMIN DEDICADO */
          <div className="mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
            
            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">Acceso Administrativo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Módulo reservado para gerencia y cajeros de ventanilla
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs">Correo Electrónico</Label>
                  <Input
                    type="email"
                    value={adminCorreo}
                    onChange={(e) => setAdminCorreo(e.target.value)}
                    required
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs">Contraseña de Administrador</Label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 mt-2 h-11 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Ingresar a la Consola
                </Button>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs">
                  <p className="font-semibold text-purple-300">Credenciales del Proyecto (Rubrica):</p>
                  <p className="mt-1 text-muted-foreground">Usuario: <span className="font-mono text-foreground font-semibold">admin@banco.com</span></p>
                  <p className="text-muted-foreground">Clave: <span className="font-mono text-foreground font-semibold">Banco123*</span></p>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminCorreo("admin@banco.com");
                      setAdminPassword("Banco123*");
                    }}
                    className="mt-2 w-full rounded-lg bg-purple-500/20 py-1.5 text-center text-[11px] font-semibold text-purple-300 hover:bg-purple-500/30"
                  >
                    ⚡ Autocompletar Cuenta Administrador
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* PANEL CON 4 KPIS Y GESTIÓN */
          <div className="space-y-6">
            {/* 4 KPIS EN FILA (EXIGIDOS EN PÁG. 7-8 DEL PROYECTO) */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-400 font-semibold uppercase">Total Clientes</span>
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.totalClientes}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Registrados en MySQL</p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-semibold uppercase">Cuentas Activas</span>
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.cuentasActivas}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Operativas para transacciones</p>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-400 font-semibold uppercase">Bloqueadas</span>
                  <Lock className="h-5 w-5 text-rose-400" />
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-slate-100">{kpis.cuentasBloqueadas}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Cuentas suspendidas</p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-semibold uppercase">Bóveda Total</span>
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-amber-300 truncate">{fmt(kpis.totalBoveda)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Saldo global en custodia</p>
              </div>
            </div>

            {/* ACCIONES RÁPIDAS: CONSIGNAR EN VENTANILLA Y CREAR CLIENTE */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
              <div>
                <h3 className="font-display text-lg font-bold">Ventanilla Bancaria</h3>
                <p className="text-xs text-muted-foreground">Aplica depósitos presenciales y crea nuevas cuentas</p>
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

            {/* TABLA DE CLIENTES Y GESTIÓN DE BLOQUEO */}
            <section className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold">Listado de Clientes y Cuentas</h3>
                  <p className="text-xs text-muted-foreground">Control de estado activo / suspendido</p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 text-xs text-muted-foreground w-full sm:w-auto">
                  <Search className="h-3.5 w-3.5" />
                  <input
                    placeholder="Buscar por cédula o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent outline-none w-full sm:w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-secondary/40 text-muted-foreground font-mono uppercase">
                    <tr>
                      <th className="p-3">Doc</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Correo</th>
                      <th className="p-3">No. Cuenta</th>
                      <th className="p-3">Saldo</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {clientesFiltrados.map((cli) => {
                      const estado = cli.estado || cli.estado_cliente || (cli.estado_id === 1 ? "ACTIVO" : "BLOQUEADO");
                      const esActivo = estado === "ACTIVO";
                      return (
                        <tr key={cli.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-3 font-mono font-semibold">{cli.tipo_doc || "CC"} {cli.numero_documento}</td>
                          <td className="p-3 font-medium text-foreground">{cli.nombres} {cli.apellidos}</td>
                          <td className="p-3 text-muted-foreground">{cli.correo}</td>
                          <td className="p-3 font-mono text-cyan-400 font-semibold">{cli.numero_cuenta || "Sin cuenta"}</td>
                          <td className="p-3 font-mono font-bold text-foreground">{cli.saldo !== undefined ? fmt(cli.saldo) : "$ 0 COP"}</td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                esActivo
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {estado}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEstadoCliente(cli)}
                              className={`h-7 px-2.5 text-[11px] gap-1 ${
                                esActivo
                                  ? "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                                  : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {esActivo ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                              {esActivo ? "Bloquear" : "Activar"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* TABLA DE AUDITORÍA GLOBAL DE MOVIMIENTOS */}
            <section className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold">Historial General de Auditoría</h3>
                  <p className="text-xs text-muted-foreground">Registro de todas las transacciones del banco</p>
                </div>
                <Button variant="ghost" size="sm" onClick={cargarAuditoria} className="h-8 text-xs gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                </Button>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b bg-secondary/40 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Fecha / Hora</th>
                      <th className="p-2.5">Canal</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Cuenta</th>
                      <th className="p-2.5">Monto</th>
                      <th className="p-2.5">Saldo Resultante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditoria.map((a) => {
                      const esCredito = a.sentido === "CREDITO";
                      return (
                        <tr key={a.id} className="hover:bg-secondary/20">
                          <td className="p-2.5 text-muted-foreground">#{a.id}</td>
                          <td className="p-2.5">{new Date(a.fecha_hora).toLocaleString("es-CO")}</td>
                          <td className="p-2.5">
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                              {a.canal}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-200">{a.tipo_operacion || a.descripcion}</td>
                          <td className="p-2.5 text-cyan-400 font-semibold">{a.numero_cuenta}</td>
                          <td className={`p-2.5 font-bold ${esCredito ? "text-emerald-400" : "text-slate-200"}`}>
                            {esCredito ? "+" : "-"}{fmt(a.valor)}
                          </td>
                          <td className="p-2.5 text-muted-foreground">{fmt(a.saldo_resultante)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* MODAL CONSIGNAR EN VENTANILLA (CASO CLAVE DE PRUEBA: $100.000 COP) */}
      <Dialog open={openConsignar} onOpenChange={setOpenConsignar}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Consignación en Ventanilla</DialogTitle>
            <DialogDescription>
              Depósito en efectivo directo a la cuenta bancaria del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConsignar} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Número de Cuenta Destino</Label>
              <Input
                value={cuentaConsignar}
                onChange={(e) => setCuentaConsignar(e.target.value)}
                placeholder="400110203040"
                required
                className="mt-1 font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cuenta de prueba del docente: <button type="button" onClick={() => setCuentaConsignar("400110203040")} className="text-accent underline">400110203040 (Andrés)</button>
              </p>
            </div>

            <div>
              <Label className="text-xs">Monto a Consignar (COP)</Label>
              <Input
                type="number"
                step="1000"
                value={montoConsignar}
                onChange={(e) => setMontoConsignar(e.target.value)}
                required
                className="mt-1 font-mono text-lg font-bold"
              />
              <div className="mt-1 flex gap-2">
                {[50000, 100000, 200000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMontoConsignar(v.toString())}
                    className="rounded bg-secondary px-2 py-0.5 text-[11px] hover:bg-secondary/80 font-mono"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Concepto / Referencia</Label>
              <Input
                value={conceptoConsignar}
                onChange={(e) => setConceptoConsignar(e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpenConsignar(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={consignarLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white">
                {consignarLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Efectuar Depósito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL RECIBO DE CONSIGNACIÓN */}
      <Dialog open={!!reciboConsignacion} onOpenChange={() => setReciboConsignacion(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">¡Depósito Exitoso!</DialogTitle>
            <DialogDescription className="text-center">
              Comprobante de ventanilla registrado en MySQL.
            </DialogDescription>
          </DialogHeader>

          {reciboConsignacion && (
            <div className="space-y-2 rounded-lg border border-border/80 bg-secondary/30 p-4 text-xs font-mono">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Operación:</span>
                <span className="font-bold">#{reciboConsignacion.numero_operacion}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{new Date(reciboConsignacion.fecha).toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Cuenta:</span>
                <span>{reciboConsignacion.numero_cuenta}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Titular:</span>
                <span className="font-semibold text-foreground">{reciboConsignacion.titular}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Valor Depositado:</span>
                <span className="font-bold text-emerald-400">{fmt(reciboConsignacion.valor)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-muted-foreground">Nuevo Saldo:</span>
                <span className="text-cyan-400">{fmt(reciboConsignacion.nuevo_saldo)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setReciboConsignacion(null)} className="w-full">
              Cerrar Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR NUEVO CLIENTE CON CUENTA BANCARIA */}
      <Dialog open={openCrearCliente} onOpenChange={setOpenCrearCliente}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Registrar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Crea un cliente con cuenta bancaria activa y saldo de apertura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearCliente} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombres</Label>
                <Input
                  value={nuevoCliente.nombres}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                  placeholder="Carlos"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Apellidos</Label>
                <Input
                  value={nuevoCliente.apellidos}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                  placeholder="Ramírez"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">No. Documento (Cédula)</Label>
                <Input
                  value={nuevoCliente.numero_documento}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, numero_documento: e.target.value })}
                  placeholder="1009876543"
                  required
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono Móvil</Label>
                <Input
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                  placeholder="3119876543"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Correo Electrónico</Label>
              <Input
                type="email"
                value={nuevoCliente.correo}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                placeholder="carlos@correo.com"
                required
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">Depósito Inicial de Apertura (COP)</Label>
              <Input
                type="number"
                step="10000"
                value={nuevoCliente.saldo_inicial}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, saldo_inicial: e.target.value })}
                required
                className="mt-1 font-mono font-bold"
              />
            </div>

            <div className="rounded-xl border border-secondary bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
              Se creará automáticamente una cuenta de ahorros, PIN de cajero <span className="font-mono text-foreground font-semibold">1234</span> y contraseña temporal <span className="font-mono text-foreground font-semibold">Banco123*</span>.
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenCrearCliente(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearLoading} className="gap-2">
                {crearLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Crear Cliente y Cuenta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
