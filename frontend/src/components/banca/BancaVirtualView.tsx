import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, PiggyBank, Settings,
  Bell, Search, ArrowUpRight, ArrowDownLeft, Send, Plus, Receipt, Landmark,
  MoreHorizontal, LogOut, CheckCircle2, ShieldCheck, RefreshCw, KeyRound, User
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
        setUsuario(null);
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

      toast.success(data.mensaje);
      setComprobante(data.comprobante);
      setOpenTransferir(false);
      setMontoTransferir("");
      setConceptoTransferir("");

      cargarResumen();
    } catch (err) {
      toast.error("Error al procesar la transferencia.");
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
      toast.success(data.mensaje);
      if (usuario) setUsuario({ ...usuario, telefono });
    } catch (err) {
      toast.error("Error de comunicación.");
    } finally {
      setAjustesLoading(false);
    }
  };

  const handleCambiarPass = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const accountsDisplay = [
    {
      name: cuentaActiva?.tipo_cuenta || "Cuenta de Ahorros",
      num: cuentaActiva ? `•••• ${cuentaActiva.numero_cuenta.slice(-4)}` : "•••• 3040",
      bal: saldoReal,
      sub: "Disponible en MySQL · Principal",
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
    { icon: LayoutDashboard, label: "Inicio", active: true, action: () => {} },
    { icon: ArrowLeftRight, label: "Transferir", action: () => setOpenTransferir(true) },
    { icon: Receipt, label: "Cajero", action: () => onSwitchModule?.("cajero") },
    { icon: ShieldCheck, label: "Admin", action: () => onSwitchModule?.("admin") },
    { icon: MoreHorizontal, label: "Ajustes", action: () => setOpenAjustes(true) },
  ];

  // SI NO HAY USUARIO AUTENTICADO: PANTALLA DEDICADA DE LOGIN CLIENTE
  if (!usuario && !loading) {
    return (
      <div className="min-h-[calc(100vh-53px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
          
          <div className="relative">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-inner">
                <Landmark className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-bold">Banca Virtual Personas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ingrese sus credenciales de cliente para consultar saldos y transferir.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <Label className="text-xs">Correo Electrónico o Documento</Label>
                <Input
                  value={loginIdentificador}
                  onChange={(e) => setLoginIdentificador(e.target.value)}
                  placeholder="andres@cliente.com"
                  required
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Contraseña Bancaria</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full gap-2 mt-2 h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {loginLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Ingresar a Banca Virtual
              </Button>

              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-accent">Credenciales del Docente:</span>
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent font-mono font-bold">Rubrica</span>
                </div>
                <p className="text-muted-foreground">Usuario: <span className="font-mono text-foreground font-semibold">andres@cliente.com</span></p>
                <p className="text-muted-foreground">Clave: <span className="font-mono text-foreground font-semibold">Banco123*</span></p>
                <button
                  type="button"
                  onClick={() => {
                    setLoginIdentificador("andres@cliente.com");
                    setLoginPassword("Banco123*");
                  }}
                  className="mt-2.5 w-full rounded-lg bg-primary/20 py-2 text-center text-xs font-semibold text-accent hover:bg-primary/30 transition-colors"
                >
                  ⚡ Autocompletar Cuenta Andrés Pai
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-53px)] bg-background font-sans text-foreground">
      {/* ASIDE / SIDEBAR FIJO DESKTOP */}
      <aside className="fixed top-[53px] bottom-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="mb-6 flex min-w-0 items-center gap-2.5">
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

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CON PL-64 EN DESKTOP */}
      <div className="lg:pl-64">
        {/* HEADER LIMPIO Y ESPACIOSO */}
        <header className="border-b bg-background/80 backdrop-blur px-4 py-4 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            {/* SALUDO AL CLIENTE */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bienvenido(a)</p>
              <h1 className="truncate font-display text-2xl font-bold text-foreground">
                {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Andrés Paiwa"}
              </h1>
            </div>

            {/* ACCIONES DEL HEADER */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                <input
                  placeholder="Buscar movimientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none w-36 lg:w-48 placeholder:text-muted-foreground"
                />
              </div>

              <button
                aria-label="Actualizar datos"
                className="relative grid h-9 w-9 place-items-center rounded-xl border bg-card text-muted-foreground hover:text-foreground transition-colors"
                onClick={cargarResumen}
                title="Actualizar datos desde MySQL"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 h-9"
              >
                <LogOut className="h-3.5 w-3.5" /> Salir
              </Button>
            </div>
          </div>
        </header>

        {/* CONTENIDO CENTRAL */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {/* GRID: SALDO DISPONIBLE Y TARJETA */}
          <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            {/* HERO CARD SALDO */}
            <section className="relative flex min-w-0 items-center overflow-hidden rounded-xl bg-gradient-card p-6 text-primary-foreground ring-1 ring-primary/25 sm:p-7 shadow-xl">
              <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
              <div className="relative w-full">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Saldo Total Disponible</p>
                    <p className="mt-2 truncate font-display text-3xl font-bold sm:text-4xl text-white">
                      {fmt(saldoReal)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    +8,2%
                  </span>
                </div>
                <p className="mt-2 text-xs opacity-70">
                  {cuentas.length || 1} cuenta(s) activa(s) · Conectado en vivo a MySQL 3NF
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  <Button
                    onClick={() => setOpenTransferir(true)}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-xl bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Send className="h-4 w-4 shrink-0 text-cyan-300" /> Transferir
                  </Button>
                  <Button
                    onClick={() => onSwitchModule?.("cajero")}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-xl bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <Receipt className="h-4 w-4 shrink-0 text-cyan-300" /> Ir a Cajero
                  </Button>
                  <Button
                    onClick={() => setOpenAjustes(true)}
                    variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-xl bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  >
                    <User className="h-4 w-4 shrink-0 text-cyan-300" /> Mi Perfil
                  </Button>
                </div>
              </div>
            </section>

            {/* TARJETA DE CRÉDITO ORIGINAL */}
            <section
              aria-label="Tarjeta débito"
              className="mx-auto flex aspect-[1.586/1] w-full max-w-[380px] min-w-0 flex-col justify-between rounded-xl border border-payment-data/30 bg-payment-card p-6 text-payment-data shadow-xl relative overflow-hidden"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarjeta Débito / Ahorros</p>
                <CreditCard aria-hidden className="h-6 w-6 shrink-0 text-cyan-400" />
              </div>
              <p className="my-4 whitespace-nowrap font-mono text-xl tracking-wider text-slate-100">
                {cuentaActiva?.numero_cuenta ? `${cuentaActiva.numero_cuenta.slice(0, 4)} •••• •••• ${cuentaActiva.numero_cuenta.slice(-4)}` : "4001 •••• •••• 3040"}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Titular</p>
                  <p className="font-semibold text-slate-200">
                    {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "JAIRO ANDRÉS PAI"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground">Vence</p>
                  <p className="font-mono text-slate-300">11/29</p>
                </div>
              </div>
            </section>
          </div>

          {/* TUS CUENTAS */}
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Tus Cuentas</h2>
              <span className="text-xs text-muted-foreground">Datos en tiempo real</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accountsDisplay.map((a) => (
                <div
                  key={a.num}
                  onClick={a.onClick}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4.5 transition-all ${
                    a.active
                      ? "border-primary/50 bg-card shadow-lg ring-1 ring-primary/25"
                      : "border-border bg-card/60 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <span className="font-mono text-xs text-muted-foreground">{a.num}</span>
                  </div>
                  <p className="mt-3 font-display text-2xl font-bold">{fmt(a.bal)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* MOVIMIENTOS Y GASTOS 2026 */}
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            {/* MOVIMIENTOS */}
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold">Últimos Movimientos</h2>
                  <p className="text-xs text-muted-foreground">Registro cronológico con saldo resultante</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => cuentaActiva && cargarMovimientos(cuentaActiva.id)} className="h-8 text-xs gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                </Button>
              </div>

              {movimientosFiltrados.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No hay movimientos registrados en esta cuenta.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {movimientosFiltrados.map((m) => {
                    const esIngreso = m.sentido === "CREDITO" || (m.tipo_movimiento === "CREDITO");
                    return (
                      <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-lg ${
                            esIngreso ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {esIngreso ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{m.descripcion || m.tipo_operacion}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.tipo_operacion} · {new Date(m.fecha_hora).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-sm font-semibold ${esIngreso ? "text-emerald-400" : "text-slate-300"}`}>
                            {esIngreso ? `+${fmt(m.valor)}` : `-${fmt(m.valor)}`}
                          </p>
                          {m.saldo_resultante !== undefined && (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              Saldo: {fmt(m.saldo_resultante)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* GRÁFICO GASTOS 2026 ORIGINAL */}
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold">Actividad 2026</h2>
                  <p className="text-xs text-muted-foreground">Balance mensual estimado</p>
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold">Noviembre</span>
              </div>
              <div className="flex h-40 items-end justify-between gap-1.5 pt-4">
                {bars.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${h}%` }}
                      className={`w-full rounded-t transition-all ${
                        i === 10 ? "bg-accent shadow-lg shadow-accent/30" : "bg-primary/40 hover:bg-primary/60"
                      }`}
                    />
                    <span className="font-mono text-[10px] text-muted-foreground">{months[i]}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-secondary/30 p-3 text-xs space-y-1">
                <p className="font-semibold text-accent">Regla de Negocio ACID:</p>
                <p className="text-[11px] text-muted-foreground">
                  Cada transferencia actualiza saldos concurrentemente con bloqueos a nivel de fila (InnoDB).
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-background/95 py-2 backdrop-blur lg:hidden">
        {mobileNav.map((n) => (
          <button
            key={n.label}
            onClick={n.action}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              n.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <n.icon className="h-5 w-5" /> {n.label}
          </button>
        ))}
      </nav>

      {/* MODAL TRANSFERIR CON 4x1000 */}
      <Dialog open={openTransferir} onOpenChange={setOpenTransferir}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Transferir Dinero</DialogTitle>
            <DialogDescription>
              Transfiere fondos a otra cuenta bancaria en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferir} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Cuenta Destino</Label>
              <Input
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                placeholder="500190807060"
                required
                className="mt-1 font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cuenta de prueba sugerida: <button type="button" onClick={() => setCuentaDestino("500190807060")} className="text-accent underline">500190807060 (Valentina Gómez)</button>
              </p>
            </div>

            <div>
              <Label className="text-xs">Monto a Transferir (COP)</Label>
              <Input
                type="number"
                step="1000"
                value={montoTransferir}
                onChange={(e) => setMontoTransferir(e.target.value)}
                placeholder="100000"
                required
                className="mt-1 font-mono text-lg font-bold"
              />
              <div className="mt-1 flex gap-2">
                {[50000, 100000, 200000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMontoTransferir(v.toString())}
                    className="rounded bg-secondary px-2 py-0.5 text-[11px] hover:bg-secondary/80 font-mono"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Concepto / Descripción (Opcional)</Label>
              <Input
                value={conceptoTransferir}
                onChange={(e) => setConceptoTransferir(e.target.value)}
                placeholder="Pago almuerzo, servicio, etc."
                className="mt-1"
              />
            </div>

            {/* DESGLOSE TRIBUTARIO 4x1000 */}
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
              <Button type="submit" disabled={transferLoading} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
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
              Gestiona tu teléfono y credenciales de acceso.
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
    </div>
  );
}
