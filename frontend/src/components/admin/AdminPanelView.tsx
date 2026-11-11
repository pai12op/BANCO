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
  onSwitchModule?: (mod: string) => void;
}

export function AdminPanelView({ onSwitchModule }: AdminPanelProps) {
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
        setKpis(data.kpis);
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
        setKpis(data.kpis);
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
      const res = await fetch("/api/admin/auditoria", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuditoria(data.movimientos || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEstadoCliente = async (cliente: any) => {
    const nuevoEstado = cliente.estado_cliente === "ACTIVO" ? "BLOQUEADO" : "ACTIVO";
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
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
      toast.error("Error al registrar cliente.");
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
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* HEADER ADMIN */}
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Consola Administrativa</h1>
              <p className="text-xs text-muted-foreground">Gestión de Cuentas, Bóveda y Ventanilla</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchModule?.("banca")}
              className="gap-1.5 text-xs border-border"
            >
              <Landmark className="h-3.5 w-3.5" /> Banca Virtual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchModule?.("cajero")}
              className="gap-1.5 text-xs border-border"
            >
              <Receipt className="h-3.5 w-3.5" /> Cajero ATM
            </Button>
            {autenticado && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs border-red-500/30 text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" /> Salir
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {!autenticado ? (
          /* LOGIN ADMIN */
          <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/20 text-purple-400">
                <ShieldCheck className="h-8 w-8" />
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
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Contraseña de Administrador</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="mt-1 font-mono"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2 h-11 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white">
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Ingresar a la Consola
              </Button>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xs">
                <p className="font-semibold text-purple-300">Credenciales del Proyecto (Rubrica):</p>
                <p className="mt-1">Usuario: <span className="font-mono text-foreground font-semibold">admin@banco.com</span></p>
                <p>Clave: <span className="font-mono text-foreground font-semibold">Banco123*</span></p>
              </div>
            </form>
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
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  <DollarSign className="h-4 w-4" /> Consignar en Ventanilla
                </Button>

                <Button
                  onClick={() => setOpenCrearCliente(true)}
                  variant="outline"
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Nuevo Cliente
                </Button>
              </div>
            </div>

            {/* TABLA DE CLIENTES Y CUENTAS */}
            <section className="rounded-2xl border bg-card p-4 lg:p-6">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold">Clientes del Banco</h3>
                  <p className="text-xs text-muted-foreground">Gestión de estados, saldos y cuentas activas</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cédula o nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs w-60"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { cargarDashboard(); cargarClientes(); }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-secondary/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Cliente</th>
                      <th className="p-3 font-semibold">Documento</th>
                      <th className="p-3 font-semibold">Número de Cuenta</th>
                      <th className="p-3 font-semibold">Saldo Actual</th>
                      <th className="p-3 font-semibold">Estado</th>
                      <th className="p-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientesFiltrados.map((c) => {
                      const esActivo = c.estado_cliente === "ACTIVO";
                      return (
                        <tr key={c.id} className="hover:bg-secondary/20">
                          <td className="p-3 font-medium">
                            <p className="text-foreground font-semibold">{c.nombres} {c.apellidos}</p>
                            <p className="text-[10px] text-muted-foreground">{c.correo}</p>
                          </td>
                          <td className="p-3 font-mono">{c.tipo_documento} {c.numero_documento}</td>
                          <td className="p-3 font-mono text-cyan-400 font-semibold">{c.numero_cuenta}</td>
                          <td className="p-3 font-mono font-bold text-foreground">{fmt(c.saldo)}</td>
                          <td className="p-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                esActivo
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {c.estado_cliente}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEstadoCliente(c)}
                              className={`h-7 px-2 text-[11px] gap-1 ${
                                esActivo
                                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {esActivo ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                              {esActivo ? "Bloquear" : "Desbloquear"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* AUDITORÍA GENERAL */}
            <section className="rounded-2xl border bg-card p-4 lg:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Auditoría Global de Operaciones</h3>
                  <p className="text-xs text-muted-foreground">Trazabilidad contable en tiempo real (Últimos movimientos)</p>
                </div>
                <Button variant="ghost" size="sm" onClick={cargarAuditoria} className="text-xs gap-1 text-accent">
                  <RefreshCw className="h-3 w-3" /> Refrescar
                </Button>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b bg-secondary/40 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Cuenta</th>
                      <th className="p-2.5">Operación / Canal</th>
                      <th className="p-2.5">Sentido</th>
                      <th className="p-2.5">Valor</th>
                      <th className="p-2.5">Saldo Resultante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditoria.map((a) => {
                      const esCredito = a.sentido === "CREDITO";
                      return (
                        <tr key={a.id} className="hover:bg-secondary/10">
                          <td className="p-2.5 font-bold">#{a.id}</td>
                          <td className="p-2.5 text-slate-400">{new Date(a.fecha_hora).toLocaleString("es-CO")}</td>
                          <td className="p-2.5 text-cyan-400">{a.numero_cuenta}</td>
                          <td className="p-2.5 text-slate-300">{a.tipo_operacion} ({a.canal})</td>
                          <td className="p-2.5">
                            <span className={esCredito ? "text-emerald-400 font-bold" : "text-slate-300 font-bold"}>
                              {a.sentido}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-foreground">
                            {esCredito ? "+" : "-"}{fmt(a.valor)}
                          </td>
                          <td className="p-2.5 text-slate-400">{fmt(a.saldo_resultante)}</td>
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
              <Label className="text-xs">Concepto de Ventanilla</Label>
              <Input
                value={conceptoConsignar}
                onChange={(e) => setConceptoConsignar(e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenConsignar(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={consignarLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {consignarLoading && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
                Confirmar Depósito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* COMPROBANTE CONSIGNACIÓN */}
      <Dialog open={!!reciboConsignacion} onOpenChange={() => setReciboConsignacion(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">¡Depósito Aplicado con Éxito!</DialogTitle>
            <DialogDescription className="text-center">
              Recibo oficial de ventanilla emitido por la entidad.
            </DialogDescription>
          </DialogHeader>

          {reciboConsignacion && (
            <div className="space-y-2 rounded-lg border bg-secondary/30 p-4 text-xs font-mono">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Transacción #:</span>
                <span className="font-bold">#{reciboConsignacion.transaccion_id}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Titular:</span>
                <span className="font-semibold">{reciboConsignacion.titular}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Cuenta Destino:</span>
                <span>{reciboConsignacion.numero_cuenta}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Valor Consignado:</span>
                <span className="font-bold text-emerald-400">+{fmt(reciboConsignacion.valor_consignado)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Nuevo Saldo:</span>
                <span className="font-bold text-foreground">{fmt(reciboConsignacion.nuevo_saldo)}</span>
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

      {/* MODAL CREAR CLIENTE */}
      <Dialog open={openCrearCliente} onOpenChange={setOpenCrearCliente}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Registrar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Crea el perfil del cliente, su cuenta bancaria y aplica el depósito inicial de apertura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearCliente} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombres</Label>
                <Input
                  value={nuevoCliente.nombres}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Apellidos</Label>
                <Input
                  value={nuevoCliente.apellidos}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo Doc.</Label>
                <select
                  value={nuevoCliente.tipo_documento_id}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo_documento_id: parseInt(e.target.value) })}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
                >
                  <option value={1} className="bg-card">Cédula Ciudadanía (CC)</option>
                  <option value={2} className="bg-card">Cédula Extranjería (CE)</option>
                  <option value={3} className="bg-card">Pasaporte (PAS)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Número de Documento</Label>
                <Input
                  value={nuevoCliente.numero_documento}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, numero_documento: e.target.value })}
                  required
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={nuevoCliente.correo}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Depósito Inicial de Apertura (COP)</Label>
              <Input
                type="number"
                step="10000"
                value={nuevoCliente.saldo_inicial}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, saldo_inicial: e.target.value })}
                className="mt-1 font-mono font-bold"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenCrearCliente(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearLoading} className="bg-purple-600 hover:bg-purple-500 text-white">
                {crearLoading && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
                Crear Cliente y Cuenta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
