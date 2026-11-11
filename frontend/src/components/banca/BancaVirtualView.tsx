import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, PiggyBank, Settings,
  Bell, Search, ArrowUpRight, ArrowDownLeft, Send, Plus, Receipt, Landmark,
  MoreHorizontal, LogOut, CheckCircle2, ShieldCheck, RefreshCw
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
  activeModule?: string;
  onSwitchModule?: (mod: string) => void;
}

export function BancaVirtualView({ activeModule = "banca", onSwitchModule }: BancaVirtualProps) {
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
  const [cuentaDestino, setCuentaDestino] = useState("500190807060");
  const [montoTransferir, setMontoTransferir] = useState("");
  const [conceptoTransferir, setConceptoTransferir] = useState("");
  const [aplicarCuatroPorMil, setAplicarCuatroPorMil] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  // Formulario Login
  const [loginIdentificador, setLoginIdentificador] = useState("andres@cliente.com");
  const [loginPassword, setLoginPassword] = useState("Banco123*");
  const [loginLoading, setLoginLoading] = useState(false);

  // Formulario Ajustes
  const [telefono, setTelefono] = useState("");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [ajustesLoading, setAjustesLoading] = useState(false);

  // Cargar datos de resumen desde MySQL
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
        setTelefono(data.usuario.telefono || "");
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

    const valorBase = parseFloat(montoTransferir);
    if (isNaN(valorBase) || valorBase <= 0) {
      toast.error("El monto debe ser mayor a $0.");
      return;
    }

    const impuesto = aplicarCuatroPorMil ? Math.round(valorBase * 0.004) : 0;
    const valor = valorBase + impuesto;

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
      const conceptoFinal = conceptoTransferir.trim()
        ? (impuesto > 0 ? `${conceptoTransferir.trim()} (Incluye GMF 4x1000: ${fmt(impuesto)})` : conceptoTransferir.trim())
        : (impuesto > 0 ? `Transferencia (GMF 4x1000: ${fmt(impuesto)})` : undefined);

      const res = await fetch("/api/banca/transferir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuenta_origen_id: cuentaActiva.id,
          numero_cuenta_destino: cuentaDestino.trim(),
          valor,
          concepto: conceptoFinal,
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
      setConceptoTransferir("");
      cargarResumen();
    } catch (err) {
      toast.error("Error durante la transferencia.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleActualizarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAjustesLoading(true);
      const res = await fetch("/api/banca/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefono.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar perfil.");
        return;
      }
      toast.success("Teléfono actualizado en MySQL.");
      cargarResumen();
    } catch (err) {
      toast.error("Error de conexión.");
    } finally {
      setAjustesLoading(false);
    }
  };

  const handleCambiarPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passActual || !passNueva) {
      toast.error("Complete ambos campos.");
      return;
    }
    if (passNueva.length < 6) {
      toast.error("La nueva contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    try {
      setAjustesLoading(true);
      const res = await fetch("/api/banca/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_actual: passActual, password_nuevo: passNueva }),
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

  const saldoReal = cuentaActiva ? cuentaActiva.saldo : 1000000;

  // Cuentas del dashboard
  const accountsDisplay = [
    {
      name: "Cuenta de Ahorros",
      num: "•••• 3040",
      bal: saldoReal,
      sub: "Disponible hoy · Principal",
      active: true,
      onClick: () => cuentaActiva && cargarMovimientos(cuentaActiva.id),
    },
    {
      name: "Cuenta Corriente",
      num: "•••• 7060",
      bal: 2500000,
      sub: "Valentina Gómez · Frecuente",
      active: false,
      onClick: () => {
        setCuentaDestino("500190807060");
        setOpenTransferir(true);
      },
    },
    {
      name: "CDT 180 días",
      num: "•••• 7710",
      bal: 25000000,
      sub: "Rendimiento 11.5% E.A.",
      active: false,
      onClick: () => toast.info("CDT Digital activo a 180 días."),
    },
  ];

  const totalCalculado = accountsDisplay.reduce((a, b) => a + b.bal, 0);

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

  const nav = [
    { icon: LayoutDashboard, label: "Inicio", active: true, action: () => {} },
    { icon: Wallet, label: "Cuentas", action: () => {} },
    { icon: ArrowLeftRight, label: "Transferencias", action: () => setOpenTransferir(true) },
    { icon: CreditCard, label: "Tarjetas", action: () => {} },
    { icon: PiggyBank, label: "Ahorros", action: () => {} },
    { icon: Landmark, label: "Préstamos", action: () => {} },
    { icon: Settings, label: "Ajustes", action: () => setOpenAjustes(true) },
  ];

  const mobileNav = [
    { icon: LayoutDashboard, label: "Inicio", active: true, action: () => onSwitchModule?.("banca") },
    { icon: ArrowLeftRight, label: "Transferir", action: () => setOpenTransferir(true) },
    { icon: Receipt, label: "Cajero", action: () => onSwitchModule?.("cajero") },
    { icon: ShieldCheck, label: "Admin", action: () => onSwitchModule?.("admin") },
    { icon: MoreHorizontal, label: "Ajustes", action: () => setOpenAjustes(true) },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* ASIDE / SIDEBAR FIJO EXACTO AL ORIGINAL */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="mb-8 flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <span className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Banca Verde</span>
        </div>

        <nav className="space-y-1">
          {nav.map((n) => (
            <button
              key={n.label}
              onClick={n.action}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                n.active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <n.icon className="h-4 w-4 shrink-0" /> {n.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-sidebar-accent p-4 text-sm">
            <p className="font-semibold text-sidebar-accent-foreground">¿Necesitas ayuda?</p>
            <p className="mt-1 text-xs text-sidebar-foreground/80">Línea 24/7: 01 8000 123 456</p>
          </div>

          {usuario && (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-red-400"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CON PL-64 */}
      <div className="lg:pl-64">
        {/* HEADER ÚNICO Y LIMPIO */}
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-8">
            {/* MOBILE TITLE */}
            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold leading-tight">Banca Verde</p>
                <p className="truncate text-xs text-muted-foreground">Buenas noches, Andrés</p>
              </div>
            </div>

            {/* DESKTOP TITLE */}
            <div className="hidden min-w-0 lg:block">
              <p className="text-sm text-muted-foreground">Buenas noches,</p>
              <h1 className="truncate font-display text-2xl font-bold">Andrés Paiwa</h1>
            </div>

            {/* SWITCHER INTEGRADO Y ACCIONES */}
            <div className="flex shrink-0 items-center gap-2.5">
              {/* SELECTOR DE MÓDULOS EN EL HEADER */}
              <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1">
                <button
                  onClick={() => onSwitchModule?.("banca")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeModule === "banca"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏦 Banca
                </button>
                <button
                  onClick={() => onSwitchModule?.("cajero")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeModule === "cajero"
                      ? "bg-cyan-600 text-white shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏧 Cajero ATM
                </button>
                <button
                  onClick={() => onSwitchModule?.("admin")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeModule === "admin"
                      ? "bg-purple-600 text-white shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛡️ Admin
                </button>
              </div>

              <button
                aria-label="Notificaciones"
                className="relative grid h-9 w-9 place-items-center rounded-lg border bg-card"
                onClick={cargarResumen}
                title="Actualizar datos"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>
            </div>
          </div>
        </header>

        {/* CONTENIDO CENTRAL */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          {/* BUSCADOR */}
          <div className="mb-4 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2.5 lg:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              placeholder="Buscar movimientos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* GRID: SALDO DISPONIBLE Y TARJETA */}
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            {/* HERO CARD SALDO */}
            <section className="relative flex min-w-0 items-center overflow-hidden rounded-lg bg-gradient-card p-5 text-primary-foreground ring-1 ring-primary/25 sm:p-6">
              <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
              <div className="relative w-full">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider opacity-75">Saldo total disponible</p>
                    <p className="mt-2 truncate font-display text-3xl font-bold sm:text-4xl">{fmt(saldoReal)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    +8,2%
                  </span>
                </div>
                <p className="mt-2 text-xs opacity-70">3 cuentas activas · actualizado hoy, 7:42 p. m.</p>

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
                    <Receipt className="h-4 w-4 shrink-0" /> Pagar / ATM
                  </Button>
                  <Button
                    onClick={() => onSwitchModule?.("admin")}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-lg bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 shrink-0" /> Recargar
                  </Button>
                </div>
              </div>
            </section>

            {/* TARJETA DE CRÉDITO ORIGINAL */}
            <section
              aria-label="Tarjeta de crédito"
              className="mx-auto flex aspect-[1.586/1] w-full max-w-[380px] min-w-0 flex-col justify-between rounded-lg border border-payment-data/30 bg-payment-card p-5 text-payment-data"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="text-sm font-semibold">Tarjeta de crédito</p>
                <CreditCard aria-hidden className="h-6 w-6 shrink-0" />
              </div>
              <p className="my-4 whitespace-nowrap font-mono text-lg">5412 •••• •••• 9087</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-xs">Titular</p>
                  <p className="truncate text-sm font-semibold">A. PAIWA</p>
                </div>
                <div className="text-right text-xs">
                  <p>Vence</p>
                  <p className="mt-0.5 font-semibold">08/29</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex flex-wrap justify-between gap-1 text-[11px]">
                  <span>Cupo usado {fmt(3800000)}</span>
                  <span>38% de {fmt(10000000)}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-payment-data/15">
                  <div className="h-1 w-[38%] rounded-full bg-payment-data" />
                </div>
              </div>
            </section>
          </div>

          {/* SECCIÓN: TUS CUENTAS (3 CARDS PERFECTAMENTE ALINEADAS) */}
          <section className="mt-6">
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate font-display text-lg font-bold">Tus cuentas</h2>
              <a href="#" onClick={(e) => { e.preventDefault(); cargarResumen(); }} className="shrink-0 text-sm font-semibold text-accent">
                Ver todas
              </a>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
              {accountsDisplay.map((a) => (
                <article
                  key={a.num}
                  onClick={a.onClick}
                  className={`w-[80%] max-w-[360px] shrink-0 snap-start rounded-lg border p-4 transition-all md:w-auto md:min-w-0 md:max-w-none md:shrink cursor-pointer ${
                    a.active
                      ? "border-primary/60 bg-card shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.num}</span>
                  </div>
                  <p className="mt-3 truncate font-display text-2xl font-bold">{fmt(a.bal)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.sub}</p>
                </article>
              ))}
            </div>
          </section>

          {/* GRID INFERIOR: ÚLTIMOS MOVIMIENTOS Y GASTOS */}
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            {/* ÚLTIMOS MOVIMIENTOS */}
            <section className="rounded-2xl border bg-card p-4 lg:col-span-3 lg:p-6">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate font-display text-lg font-bold">Últimos movimientos</h2>
                <button onClick={cargarResumen} className="shrink-0 text-sm font-semibold text-accent">
                  Ver todos
                </button>
              </div>

              {movimientosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay movimientos registrados.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {movimientosFiltrados.slice(0, 6).map((t) => {
                    const isPositive = t.sentido === "CREDITO";
                    return (
                      <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                            isPositive ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{t.descripcion || t.tipo_operacion}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.tipo_operacion} · {new Date(t.fecha_hora).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`shrink-0 text-sm font-bold ${isPositive ? "text-success" : ""}`}>
                            {isPositive ? "+" : "-"}{fmt(t.valor)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Saldo: {fmt(t.saldo_resultante)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* GASTOS 2026 (IDÉNTICO EN ALTURA Y DISEÑO) */}
            <section className="rounded-2xl border bg-card p-4 lg:col-span-2 lg:p-6 flex flex-col justify-between">
              <div>
                <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold">Gastos 2026</h2>
                    <p className="truncate text-xs text-muted-foreground">Por mes</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    Noviembre
                  </span>
                </div>
                <div className="mt-8 flex h-44 items-stretch gap-1.5 sm:gap-2">
                  {bars.map((b, i) => (
                    <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                      <div
                        className={`w-full rounded-t-md transition-all ${i === 10 ? "bg-accent shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "bg-primary/70"}`}
                        style={{ height: `${b}%` }}
                      />
                      <span className={`text-[10px] ${i === 10 ? "font-bold text-accent" : "text-muted-foreground"}`}>
                        {months[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Promedio mensual</span>
                <span className="font-semibold text-foreground font-mono">{fmt(1850000)}</span>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {mobileNav.map((n) => (
            <li key={n.label}>
              <button
                onClick={n.action}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors ${
                  n.active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <n.icon className={`h-5 w-5 shrink-0 ${n.active ? "text-accent" : ""}`} />
                <span className="truncate">{n.label}</span>
              </button>
            </li>
          ))}
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
                {cuentaActiva?.numero_cuenta || "400110203040"} — Saldo: {fmt(saldoReal)}
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
                <span className="text-muted-foreground">Cuenta destino frecuente:</span>
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
                className="mt-1 text-lg font-bold font-mono"
              />
            </div>

            <div>
              <Label htmlFor="concepto" className="text-xs">Concepto / Motivo (Opcional)</Label>
              <Input
                id="concepto"
                placeholder="Ej: Pago de arriendo"
                value={conceptoTransferir}
                onChange={(e) => setConceptoTransferir(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* DESGLOSE TRIBUTARIO 4x1000 (GMF - ART. 879 E.T.) */}
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor a transferir:</span>
                <span className="font-mono font-bold">{fmt(parseFloat(montoTransferir) || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gravamen GMF (4x1.000):</span>
                <span className={`font-mono font-bold ${aplicarCuatroPorMil ? "text-amber-400" : "text-emerald-400"}`}>
                  {aplicarCuatroPorMil
                    ? `+${fmt(Math.round((parseFloat(montoTransferir) || 0) * 0.004))}`
                    : "$ 0 COP (Exenta Art. 879 E.T.)"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-bold">
                <span className="text-foreground">Total a debitar:</span>
                <span className="font-mono text-cyan-400 text-sm">
                  {fmt(
                    (parseFloat(montoTransferir) || 0) +
                      (aplicarCuatroPorMil ? Math.round((parseFloat(montoTransferir) || 0) * 0.004) : 0)
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <label htmlFor="toggle-4x1000" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  Simular cuenta no exenta (+ 4x1.000 DIAN)
                </label>
                <input
                  id="toggle-4x1000"
                  type="checkbox"
                  checked={aplicarCuatroPorMil}
                  onChange={(e) => setAplicarCuatroPorMil(e.target.checked)}
                  className="rounded border-border accent-primary cursor-pointer h-4 w-4"
                />
              </div>
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

      {/* COMPROBANTE DE TRANSFERENCIA */}
      <Dialog open={!!comprobante} onOpenChange={() => setComprobante(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">¡Transferencia Exitosa!</DialogTitle>
            <DialogDescription className="text-center">
              Comprobante digital registrado en MySQL.
            </DialogDescription>
          </DialogHeader>

          {comprobante && (
            <div className="space-y-2.5 rounded-lg border border-border/80 bg-secondary/30 p-4 text-xs font-mono">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Operación #:</span>
                <span className="font-bold text-foreground">#{comprobante.numero_operacion}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{new Date(comprobante.fecha).toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Cuenta Origen:</span>
                <span>{comprobante.cuenta_origen}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Cuenta Destino:</span>
                <span>{comprobante.cuenta_destino}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Monto:</span>
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

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Información del Titular</Label>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {usuario?.nombres || "Jairo Andrés"} {usuario?.apellidos || "Pai Guanga"}
              </p>
              <p className="text-xs text-muted-foreground">{usuario?.tipo_documento || "CC"} {usuario?.numero_documento || "1001234567"} · {usuario?.correo || "andres@cliente.com"}</p>
            </div>

            {/* ACTUALIZAR TELÉFONO */}
            <form onSubmit={handleActualizarPerfil} className="border-t pt-3 space-y-2">
              <Label htmlFor="tel-user" className="text-xs">Número de Teléfono</Label>
              <div className="flex gap-2">
                <Input
                  id="tel-user"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  className="font-mono text-xs"
                />
                <Button type="submit" size="sm" disabled={ajustesLoading} variant="outline" className="text-xs">
                  Guardar
                </Button>
              </div>
            </form>

            {/* CAMBIAR CONTRASEÑA */}
            <form onSubmit={handleCambiarPass} className="border-t pt-3 space-y-3">
              <Label className="text-xs font-semibold">Cambio de Contraseña</Label>
              <div>
                <Label htmlFor="pass-act" className="text-[11px] text-muted-foreground">Contraseña Actual</Label>
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
                <Label htmlFor="pass-new" className="text-[11px] text-muted-foreground">Nueva Contraseña</Label>
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

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenAjustes(false)}>
                  Cerrar
                </Button>
                <Button type="submit" size="sm" disabled={ajustesLoading}>
                  {ajustesLoading && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
                  Cambiar Contraseña
                </Button>
              </div>
            </form>
          </div>
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
