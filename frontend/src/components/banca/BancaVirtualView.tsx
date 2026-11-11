import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, PiggyBank, Settings,
  Bell, Search, ArrowUpRight, ArrowDownLeft, Send, Plus, Receipt, Landmark,
  MoreHorizontal, LogOut, CheckCircle2, ShieldCheck, RefreshCw, Key, AlertCircle
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

interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  numero_documento: string;
  tipo_documento: string;
}

interface Cuenta {
  id: number;
  numero_cuenta: string;
  saldo: number;
  tipo_cuenta: string;
  estado_cuenta: string;
}

interface Movimiento {
  id: number;
  sentido: "DEBITO" | "CREDITO";
  tipo_movimiento?: string;
  valor: number;
  saldo_resultante: number;
  fecha_hora: string;
  descripcion: string;
  tipo_operacion: string;
  canal: string;
}

interface BancaVirtualProps {
  onSwitchModule?: (mod: string) => void;
}

export function BancaVirtualView({ onSwitchModule }: BancaVirtualProps) {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaActiva, setCuentaActiva] = useState<Cuenta | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modales
  const [openTransferir, setOpenTransferir] = useState(false);
  const [openAjustes, setOpenAjustes] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [comprobante, setComprobante] = useState<any>(null);

  // Formulario Transferencia
  const [cuentaDestino, setCuentaDestino] = useState("");
  const [montoTransferir, setMontoTransferir] = useState("");
  const [conceptoTransferir, setConceptoTransferir] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Formulario Login
  const [loginIdentificador, setLoginIdentificador] = useState("andres@cliente.com");
  const [loginPassword, setLoginPassword] = useState("Banco123*");
  const [loginLoading, setLoginLoading] = useState(false);

  // Formulario Ajustes
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [ajustesLoading, setAjustesLoading] = useState(false);

  // Cargar datos de resumen
  const cargarResumen = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/banca/resumen", { credentials: "include" });
      if (res.status === 401) {
        setOpenLogin(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.usuario) {
        setUsuario(data.usuario);
        setTelefonoNuevo(data.usuario.telefono || "");
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
      toast.error("Error de comunicación con el servidor bancario.");
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoginLoading(true);
      const res = await fetch("/api/auth/login-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: loginIdentificador, password: loginPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales incorrectas.");
        return;
      }
      toast.success(`Bienvenido(a), ${data.usuario.nombres}`);
      setOpenLogin(false);
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
      setOpenLogin(true);
      toast.info("Sesión cerrada correctamente.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaActiva) return;

    const valor = parseFloat(montoTransferir);
    if (isNaN(valor) || valor <= 0) {
      toast.error("El monto debe ser mayor a $0.");
      return;
    }

    if (valor > cuentaActiva.saldo) {
      toast.error(`Saldo insuficiente. Saldo disponible: ${fmt(cuentaActiva.saldo)}`);
      return;
    }

    if (!cuentaDestino.trim()) {
      toast.error("Ingrese el número de cuenta de destino.");
      return;
    }

    try {
      setTransferLoading(true);
      const res = await fetch("/api/banca/transferir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuenta_origen_id: cuentaActiva.id,
          numero_cuenta_destino: cuentaDestino.trim(),
          valor,
          concepto: conceptoTransferir.trim() || undefined,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo realizar la transferencia.");
        return;
      }

      toast.success("¡Transferencia realizada con éxito!");
      setComprobante(data.comprobante);
      setOpenTransferir(false);
      setMontoTransferir("");
      setCuentaDestino("");
      setConceptoTransferir("");
      cargarResumen();
    } catch (err) {
      toast.error("Error de comunicación durante la transferencia.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCambiarPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passActual || !passNueva) {
      toast.error("Debe ingresar la contraseña actual y la nueva.");
      return;
    }
    if (passNueva.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      setAjustesLoading(true);
      const res = await fetch("/api/banca/cambiar-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar contraseña.");
        return;
      }
      toast.success("Contraseña actualizada exitosamente.");
      setPassActual("");
      setPassNueva("");
      setOpenAjustes(false);
    } catch (err) {
      toast.error("Error de comunicación.");
    } finally {
      setAjustesLoading(false);
    }
  };

  const saldoTotal = cuentas.reduce((acc, c) => acc + parseFloat(c.saldo as any || 0), 0);

  const movimientosFiltrados = movimientos.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.descripcion?.toLowerCase().includes(term) ||
      m.tipo_operacion?.toLowerCase().includes(term) ||
      m.valor?.toString().includes(term)
    );
  });

  const bars = [42, 65, 38, 80, 55, 72, 90, 48, 60, 76, 52, 68];
  const months = "EFMAMJJASOND";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* SIDEBAR PARA DESKTOP */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="mb-6 flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <span className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Banca Andina</span>
            <p className="text-[10px] text-muted-foreground">Simulador Web 3NF</p>
          </div>
        </div>

        {/* SELECTOR DE MÓDULOS DEL PROYECTO */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Módulos del Sistema</p>
          <div className="space-y-1">
            <button
              onClick={() => onSwitchModule?.("banca")}
              className="flex w-full items-center gap-2 rounded-lg bg-sidebar-primary px-2.5 py-1.5 text-xs font-semibold text-sidebar-primary-foreground"
            >
              <Landmark className="h-3.5 w-3.5" /> Banca Virtual
            </button>
            <button
              onClick={() => onSwitchModule?.("cajero")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Receipt className="h-3.5 w-3.5" /> Cajero ATM
            </button>
            <button
              onClick={() => onSwitchModule?.("admin")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Panel Admin
            </button>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => {}}
            className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
          >
            <LayoutDashboard className="h-4 w-4" /> Inicio
          </button>
          <button
            onClick={() => setOpenTransferir(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeftRight className="h-4 w-4" /> Transferir
          </button>
          <button
            onClick={() => setOpenAjustes(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="h-4 w-4" /> Ajustes / Perfil
          </button>
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-border/50 bg-sidebar-accent p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-semibold text-sidebar-accent-foreground">MySQL Conectado</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Base de datos en 3NF activa</p>
          </div>

          {usuario && (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="lg:pl-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold leading-tight">Banca Andina</p>
                <p className="truncate text-xs text-muted-foreground">
                  {usuario ? `Hola, ${usuario.nombres.split(" ")[0]}` : "No autenticado"}
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 lg:block">
              <p className="text-sm text-muted-foreground">Bienvenido al simulador,</p>
              <h1 className="truncate font-display text-2xl font-bold">
                {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Cliente Invitado"}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cargarResumen}
                className="hidden gap-1.5 border-border bg-card text-xs sm:inline-flex"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
              </Button>
              {usuario ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5 border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" /> Salir
                </Button>
              ) : (
                <Button size="sm" onClick={() => setOpenLogin(true)} className="gap-1.5 text-xs">
                  Iniciar Sesión
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* CUERPO DEL PANEL */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          {/* BARRA DE BÚSQUEDA */}
          <div className="mb-4 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2.5 lg:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              placeholder="Buscar movimientos por concepto, monto o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* GRID PRINCIPAL: SALDO DISPONIBLE Y TARJETA */}
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            {/* HERO CARD: SALDO TOTAL */}
            <section className="relative flex min-w-0 items-center overflow-hidden rounded-lg bg-gradient-card p-5 text-primary-foreground ring-1 ring-primary/25 sm:p-6">
              <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
              <div className="relative w-full">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider opacity-75">Saldo Total Disponible</p>
                    <p className="mt-2 truncate font-display text-3xl font-bold sm:text-4xl">
                      {fmt(cuentaActiva ? cuentaActiva.saldo : saldoTotal)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    {cuentaActiva ? cuentaActiva.estado_cuenta : "ACTIVA"}
                  </span>
                </div>
                <p className="mt-2 text-xs opacity-70">
                  {cuentas.length} {cuentas.length === 1 ? "cuenta activa" : "cuentas activas"} · Datos en vivo desde MySQL
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => setOpenTransferir(true)}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-lg bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Send className="h-4 w-4 shrink-0" /> Transferir
                  </Button>
                  <Button
                    onClick={() => onSwitchModule?.("cajero")}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-lg bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Receipt className="h-4 w-4 shrink-0" /> Ir a Cajero
                  </Button>
                  <Button
                    onClick={() => setOpenAjustes(true)}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-lg bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Settings className="h-4 w-4 shrink-0" /> Perfil
                  </Button>
                </div>
              </div>
            </section>

            {/* TARJETA DE CRÉDITO VISUAL */}
            <section
              aria-label="Tarjeta de crédito"
              className="mx-auto flex aspect-[1.586/1] w-full max-w-[380px] min-w-0 flex-col justify-between rounded-lg border border-payment-data/30 bg-payment-card p-5 text-payment-data"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="text-sm font-semibold">Tarjeta Débito / Ahorros</p>
                <CreditCard aria-hidden className="h-6 w-6 shrink-0 text-cyan-400" />
              </div>
              <p className="my-4 whitespace-nowrap font-mono text-lg tracking-wider text-slate-100">
                {cuentaActiva ? cuentaActiva.numero_cuenta.replace(/(\d{4})/g, "$1 ").trim() : "4001 •••• •••• 3040"}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground">Titular</p>
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {usuario ? `${usuario.nombres.toUpperCase()} ${usuario.apellidos.toUpperCase()}` : "ANDRES PAI GUANGA"}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-[10px] uppercase text-muted-foreground">Vence</p>
                  <p className="mt-0.5 font-semibold text-slate-100">11/29</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
                  <span>PIN Asignado: ****</span>
                  <span className="text-cyan-400">Canal Seguro</span>
                </div>
              </div>
            </section>
          </div>

          {/* SECCIÓN: TUS CUENTAS */}
          <section className="mt-6">
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate font-display text-lg font-bold">Tus Cuentas Bancarias</h2>
              <span className="shrink-0 text-xs text-muted-foreground">Selecciona una para ver movimientos</span>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
              {cuentas.map((c) => {
                const isSelected = cuentaActiva?.id === c.id;
                return (
                  <article
                    key={c.id}
                    onClick={() => {
                      setCuentaActiva(c);
                      cargarMovimientos(c.id);
                    }}
                    className={`cursor-pointer w-[80%] max-w-[360px] shrink-0 snap-start rounded-lg border p-4 transition-all md:w-auto md:min-w-0 md:max-w-none md:shrink ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate text-sm font-semibold">Cuenta de {c.tipo_cuenta}</p>
                      <span className="shrink-0 text-xs font-mono text-muted-foreground">{c.numero_cuenta}</span>
                    </div>
                    <p className="mt-3 truncate font-display text-2xl font-bold">{fmt(c.saldo)}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Disponible en línea</span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        {c.estado_cuenta}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* MOVIMIENTOS Y GASTOS */}
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            {/* TABLA DE MOVIMIENTOS */}
            <section className="rounded-2xl border bg-card p-4 lg:col-span-3 lg:p-6">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate font-display text-lg font-bold">Historial de Movimientos</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cuentaActiva && cargarMovimientos(cuentaActiva.id)}
                  className="h-8 gap-1 text-xs text-accent"
                >
                  <RefreshCw className="h-3 w-3" /> Recargar
                </Button>
              </div>

              {movimientosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No se encontraron movimientos registrados en esta cuenta.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {movimientosFiltrados.map((m) => {
                    const esCredito = m.sentido === "CREDITO";
                    return (
                      <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                            esCredito ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {esCredito ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{m.descripcion || m.tipo_operacion}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.tipo_operacion} · {new Date(m.fecha_hora).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`shrink-0 text-sm font-bold ${esCredito ? "text-emerald-400" : "text-slate-200"}`}>
                            {esCredito ? "+" : "-"}{fmt(m.valor)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Saldo: {fmt(m.saldo_resultante)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* GRÁFICA GASTOS */}
            <section className="rounded-2xl border bg-card p-4 lg:col-span-2 lg:p-6">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold">Actividad 2026</h2>
                  <p className="truncate text-xs text-muted-foreground">Balance mensual estimado</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  Noviembre
                </span>
              </div>
              <div className="mt-6 flex h-40 items-stretch gap-1.5 sm:gap-2">
                {bars.map((b, i) => (
                  <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <div
                      className={`w-full rounded-t-md transition-all ${i === 10 ? "bg-accent shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-primary/60"}`}
                      style={{ height: `${b}%` }}
                    />
                    <span className={`text-[10px] ${i === 10 ? "font-bold text-accent" : "text-muted-foreground"}`}>
                      {months[i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-border/50 bg-secondary/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Regla de Negocio ACID:</p>
                <p className="mt-1">Cada transferencia actualiza saldos concurrentemente con bloqueos a nivel de fila (InnoDB).</p>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* NAVEGACIÓN INFERIOR PARA MÓVIL */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          <li>
            <button
              onClick={() => onSwitchModule?.("banca")}
              className="flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-accent"
            >
              <Landmark className="h-5 w-5 text-accent" />
              <span>Banca</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setOpenTransferir(true)}
              className="flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="h-5 w-5" />
              <span>Transferir</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => onSwitchModule?.("cajero")}
              className="flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Receipt className="h-5 w-5" />
              <span>Cajero</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => onSwitchModule?.("admin")}
              className="flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Admin</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* MODAL TRANSFERIR */}
      <Dialog open={openTransferir} onOpenChange={setOpenTransferir}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nueva Transferencia</DialogTitle>
            <DialogDescription>
              Transfiere dinero al instante entre cuentas del banco con registro contable 3NF.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferir} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Cuenta Origen</Label>
              <div className="mt-1 rounded-lg border bg-secondary/40 p-2.5 text-sm font-mono">
                {cuentaActiva?.numero_cuenta} — Saldo: {fmt(cuentaActiva?.saldo || 0)}
              </div>
            </div>

            <div>
              <Label htmlFor="destino" className="text-xs">Número de Cuenta Destino</Label>
              <Input
                id="destino"
                placeholder="Ej: 500190807060"
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                required
                className="font-mono mt-1"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Cuenta de prueba:</span>
                <button
                  type="button"
                  onClick={() => setCuentaDestino("500190807060")}
                  className="font-semibold text-accent hover:underline"
                >
                  Valentina Gómez (500190807060)
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="monto" className="text-xs">Monto a Transferir (COP)</Label>
              <Input
                id="monto"
                type="number"
                min="1000"
                step="1000"
                placeholder="Ej: 50000"
                value={montoTransferir}
                onChange={(e) => setMontoTransferir(e.target.value)}
                required
                className="mt-1 text-lg font-bold"
              />
            </div>

            <div>
              <Label htmlFor="concepto" className="text-xs">Concepto / Motivo (Opcional)</Label>
              <Input
                id="concepto"
                placeholder="Ej: Pago de almuerzo"
                value={conceptoTransferir}
                onChange={(e) => setConceptoTransferir(e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpenTransferir(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={transferLoading} className="gap-2">
                {transferLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Confirmar Transferencia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL COMPROBANTE EXITOSO */}
      <Dialog open={!!comprobante} onOpenChange={() => setComprobante(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">¡Transferencia Exitosa!</DialogTitle>
            <DialogDescription className="text-center">
              Comprobante digital generado por el sistema central.
            </DialogDescription>
          </DialogHeader>

          {comprobante && (
            <div className="space-y-3 rounded-lg border border-border/80 bg-secondary/30 p-4 text-xs font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Operación #:</span>
                <span className="font-bold text-foreground">{comprobante.numero_operacion}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Fecha y Hora:</span>
                <span>{new Date(comprobante.fecha).toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cuenta Origen:</span>
                <span>{comprobante.cuenta_origen}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cuenta Destino:</span>
                <span>{comprobante.cuenta_destino}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Monto Transferido:</span>
                <span className="font-bold text-emerald-400">{fmt(comprobante.valor)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Nuevo Saldo:</span>
                <span className="font-bold text-foreground">{fmt(comprobante.nuevo_saldo_origen)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setComprobante(null)} className="w-full">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL AJUSTES / CAMBIO DE CONTRASEÑA */}
      <Dialog open={openAjustes} onOpenChange={setOpenAjustes}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Perfil y Seguridad</DialogTitle>
            <DialogDescription>
              Gestiona tu contraseña y credenciales de acceso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCambiarPass} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Titular</Label>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {usuario?.nombres} {usuario?.apellidos}
              </p>
              <p className="text-xs text-muted-foreground">{usuario?.correo} · Documento: {usuario?.numero_documento}</p>
            </div>

            <div className="border-t pt-3">
              <Label htmlFor="pass-act" className="text-xs">Contraseña Actual</Label>
              <Input
                id="pass-act"
                type="password"
                placeholder="Tu contraseña actual"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pass-new" className="text-xs">Nueva Contraseña</Label>
              <Input
                id="pass-new"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpenAjustes(false)}>
                Cerrar
              </Button>
              <Button type="submit" disabled={ajustesLoading}>
                {ajustesLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Actualizar Contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL INICIAR SESIÓN */}
      <Dialog open={openLogin} onOpenChange={setOpenLogin}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">Banca Virtual — Inicio de Sesión</DialogTitle>
            <DialogDescription className="text-center">
              Ingresa tus credenciales para acceder a tus cuentas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-4 py-2">
            <div>
              <Label htmlFor="login-id" className="text-xs">Correo o Cédula</Label>
              <Input
                id="login-id"
                value={loginIdentificador}
                onChange={(e) => setLoginIdentificador(e.target.value)}
                required
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="login-pass" className="text-xs">Contraseña</Label>
              <Input
                id="login-pass"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="mt-1 font-mono"
              />
            </div>

            <Button type="submit" disabled={loginLoading} className="w-full gap-2 mt-4">
              {loginLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Entrar a la Banca Virtual
            </Button>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-primary">Credenciales de prueba cargadas:</p>
              <p className="mt-0.5">Usuario: <span className="font-mono text-foreground">andres@cliente.com</span></p>
              <p>Clave: <span className="font-mono text-foreground">Banco123*</span></p>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
