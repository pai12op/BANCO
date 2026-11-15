import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard, Landmark, Receipt, ArrowLeftRight, ShieldCheck,
  CheckCircle2, AlertTriangle, RefreshCw, LogOut, DollarSign,
  ArrowDownLeft, ArrowUpRight, KeyRound, Printer
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface CajeroAtmProps {
  activeModule?: string;
  onSwitchModule?: (mod: string) => void;
}

export function CajeroAtmView({ activeModule = "cajero", onSwitchModule }: CajeroAtmProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cuentaNumero, setCuentaNumero] = useState("");
  const [pin, setPin] = useState("");
  const [modoAcceso, setModoAcceso] = useState<"codigo" | "tarjeta">("codigo");
  const [cuentaInfo, setCuentaInfo] = useState<any>(null);

  // Estados de pantalla del cajero: 'menu' | 'saldo' | 'retirar' | 'confirmar_retiro' | 'movimientos' | 'recibo'
  const [pantalla, setPantalla] = useState<"menu" | "saldo" | "retirar" | "confirmar_retiro" | "movimientos" | "recibo">("menu");
  const [montoARetirar, setMontoARetirar] = useState<number>(50000);
  const [codigoOtpRetiro, setCodigoOtpRetiro] = useState("");
  const [recibo, setRecibo] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [otroValor, setOtroValor] = useState("");

  const handleSeleccionarMonto = (m: number) => {
    if (isNaN(m) || m <= 0) {
      toast.error("Por favor ingrese un monto válido.");
      return;
    }
    if (m % 10000 !== 0) {
      toast.error("El monto debe ser múltiplo de $10.000 COP.");
      return;
    }
    const saldoActual = Number(cuentaInfo?.saldo) || 0;
    if (m > saldoActual) {
      toast.error(`Fondos insuficientes. Su saldo disponible es de ${fmt(saldoActual)}.`);
      return;
    }
    setMontoARetirar(m);
    setPantalla("confirmar_retiro");
  };

  // Verificar sesión existente en cajero o parámetros en URL desde Banca Virtual
  useEffect(() => {
    checkSesion();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cParam = params.get("cuenta");
      const codParam = params.get("codigo");
      if (cParam) setCuentaNumero(cParam);
      if (codParam) {
        setPin(codParam);
        setCodigoOtpRetiro(codParam);
        setModoAcceso("codigo");
        toast.info("¡Código de retiro de Banca Rota cargado!");
      }
    }
  }, []);

  const checkSesion = async () => {
    try {
      const res = await fetch("/api/cajero/saldo", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCuentaInfo(data.cuenta || data);
        setAutenticado(true);
      }
    } catch (err) {
      // No hay sesión
    }
  };

  const volverAlMenu = () => {
    checkSesion();
    setPantalla("menu");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cuentaNumero || !pin) {
      toast.error("Ingrese número de cuenta y PIN.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login-cajero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_cuenta: cuentaNumero.trim(), pin: pin.trim() }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tarjeta o PIN inválido.");
        return;
      }

      toast.success("Tarjeta aceptada. Bienvenido al Cajero ATM.");
      setCuentaInfo(data.cuenta);
      setAutenticado(true);
      setPantalla("menu");
    } catch (err) {
      toast.error("Error de comunicación con el cajero automático.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetiro = async (valor: number) => {
    if (valor <= 0) {
      toast.error("Monto inválido.");
      return;
    }

    if (!codigoOtpRetiro.trim()) {
      toast.error("Por favor ingrese el código OTP de retiro (6 dígitos).");
      return;
    }

    const cleanOtp = codigoOtpRetiro.trim();
    if (cleanOtp.length !== 6 && cleanOtp.length !== 4) {
      toast.error("El código debe tener 6 dígitos (Código OTP generado) o 4 dígitos (PIN de tarjeta).");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/cajero/retirar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor, codigoOtp: cleanOtp }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo dispensar el dinero.");
        return;
      }

      toast.success(data.mensaje);
      setRecibo(data.recibo);
      setCuentaInfo((prev: any) => ({ ...prev, saldo: data.recibo.nuevo_saldo }));
      setPantalla("recibo");
    } catch (err) {
      toast.error("Error en el dispensador de efectivo.");
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cajero/movimientos", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data.movimientos || []);
        setPantalla("movimientos");
      }
    } catch (err) {
      toast.error("Error al consultar movimientos en pantalla.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setAutenticado(false);
      setCuentaInfo(null);
      setPantalla("menu");
      setRecibo(null);
      toast.info("Por favor retire su tarjeta de la ranura.");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinKey = (val: string) => {
    const maxLen = modoAcceso === "codigo" ? 6 : 4;
    if (pin.length < maxLen) {
      setPin((prev) => prev + val);
    }
  };

  const handleClearPin = () => {
    setPin("");
  };

  return (
    <div className="min-h-[calc(100vh-53px)] bg-background font-sans text-foreground">
      {/* HEADER ATM LIMPIO */}
      <header className="border-b bg-background/80 backdrop-blur px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight text-foreground">Cajero Automático ATM</h1>
              <p className="text-xs text-muted-foreground">Terminal Red Banca Rota · ATM-BOG-004 · Manizales</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs font-semibold text-muted-foreground hover:text-cyan-400 px-3 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors"
            >
              ← Portal Clientes
            </a>
            {autenticado && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-9"
              >
                <LogOut className="h-3.5 w-3.5" /> Expulsar Tarjeta
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENEDOR DEL CAJERO ESTILO HARDWARE */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!autenticado ? (
          /* PANTALLA DE INSERTAR TARJETA O INGRESAR CÓDIGO DE RETIRO */
          <div className="mx-auto max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
            
            <div className="relative">
              {/* SELECTOR DE MODALIDAD EN CAJERO: CÓDIGO VS TARJETA */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/60 p-1 border border-border/60 mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setModoAcceso("codigo");
                    setPin("");
                  }}
                  className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    modoAcceso === "codigo" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Retiro con Código</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoAcceso("tarjeta");
                    setPin("");
                  }}
                  className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    modoAcceso === "tarjeta" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Tarjeta Débito</span>
                </button>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {modoAcceso === "codigo" ? <KeyRound className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                </div>
                <h2 className="font-display text-2xl font-bold">
                  {modoAcceso === "codigo" ? "Retiro con Código OTP" : "Inserte su Tarjeta"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {modoAcceso === "codigo"
                    ? "Ingrese su cuenta y el código de 6 dígitos generado en Banca Rota."
                    : "Simulador de Cajero ATM con autenticación mediante PIN de 4 dígitos."}
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="num-cuenta" className="text-xs">
                    {modoAcceso === "codigo" ? "Número de Cuenta o Celular" : "Número de Cuenta / Tarjeta"}
                  </Label>
                  <Input
                    id="num-cuenta"
                    value={cuentaNumero}
                    onChange={(e) => setCuentaNumero(e.target.value)}
                    placeholder="400150181053"
                    className="mt-1 font-mono text-center tracking-widest text-lg bg-black/40 border-cyan-500/40 text-cyan-300"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pin-cajero" className="text-xs">
                    {modoAcceso === "codigo" ? "Código de Retiro (6 Dígitos)" : "PIN Secreto (4 Dígitos)"}
                  </Label>
                  <Input
                    id="pin-cajero"
                    type={modoAcceso === "codigo" ? "text" : "password"}
                    maxLength={modoAcceso === "codigo" ? 6 : 4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={modoAcceso === "codigo" ? "849201" : "••••"}
                    className="mt-1 font-mono text-center tracking-[0.5em] text-2xl bg-black/40 border-cyan-500/40 text-cyan-300 font-bold"
                    required
                  />
                </div>

                {/* TECLADO NUMÉRICO ATM TÁCTIL */}
                <div className="pt-2">
                  <p className="text-[11px] text-muted-foreground text-center mb-2">Teclado Numérico ATM:</p>
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handlePinKey(n.toString())}
                        className="h-10 rounded-lg bg-secondary text-base font-bold font-mono hover:bg-secondary/80 border border-border/60 transition-colors"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearPin}
                      className="h-10 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinKey("0")}
                      className="h-10 rounded-lg bg-secondary text-base font-bold font-mono hover:bg-secondary/80 border border-border/60 transition-colors"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="h-10 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                    >
                      Entrar
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 mt-4 h-11 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 cursor-pointer"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {modoAcceso === "codigo" ? "Validar Código y Retirar Dinero" : "Validar Tarjeta y PIN"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* PANTALLA TÁCTIL PRINCIPAL DEL CAJERO (ATM HARDWARE SHELL) */
          <div className="rounded-3xl border-4 border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-2xl">
            {/* PANTALLA CRT / LCD DEL ATM */}
            <div className="rounded-2xl border-2 border-cyan-500/40 bg-slate-900/90 p-6 text-slate-100 shadow-inner min-h-[460px] flex flex-col justify-between">
              {/* ENCABEZADO DE PANTALLA */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs uppercase text-cyan-400">ATM EN LÍNEA · BANCA ROTA</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{cuentaInfo?.nombres} {cuentaInfo?.apellidos}</p>
                  <p className="font-mono text-[10px] text-cyan-400">Cuenta: {cuentaInfo?.numero_cuenta}</p>
                </div>
              </div>

              {/* VISTA 1: MENÚ PRINCIPAL DEL ATM */}
              {pantalla === "menu" && (
                <div className="py-6">
                  <div className="text-center mb-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Saldo Disponible</p>
                    <p className="font-display text-4xl font-bold text-cyan-300 mt-1">{fmt(cuentaInfo?.saldo || 0)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Seleccione la operación que desea realizar:</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                    <button
                      onClick={() => setPantalla("retirar")}
                      className="flex items-center justify-between p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 transition-all text-left"
                    >
                      <div>
                        <p className="font-bold text-sm text-cyan-200">Retiro de Efectivo</p>
                        <p className="text-[10px] text-slate-400">Billetes en dispensador</p>
                      </div>
                      <DollarSign className="h-5 w-5 text-cyan-400" />
                    </button>

                    <button
                      onClick={cargarMovimientos}
                      className="flex items-center justify-between p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 transition-all text-left"
                    >
                      <div>
                        <p className="font-bold text-sm text-cyan-200">Últimos Movimientos</p>
                        <p className="text-[10px] text-slate-400">Ver extracto en pantalla</p>
                      </div>
                      <Receipt className="h-5 w-5 text-cyan-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* VISTA 2: SELECCIÓN DE MONTO A RETIRAR */}
              {pantalla === "retirar" && (
                <div className="py-4">
                  <h3 className="font-display text-lg font-bold text-center text-cyan-300">Seleccione el Monto a Retirar</h3>
                  <p className="text-xs text-center text-slate-400 mb-6">Saldo actual disponible: {fmt(cuentaInfo?.saldo || 0)}</p>

                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {[20000, 50000, 100000, 200000].map((monto) => (
                      <Button
                        key={monto}
                        disabled={loading || monto > (cuentaInfo?.saldo || 0)}
                        onClick={() => handleSeleccionarMonto(monto)}
                        className="h-14 font-mono font-bold text-base bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-800 text-cyan-200 shadow-md"
                      >
                        {fmt(monto)}
                      </Button>
                    ))}

                    <div className="col-span-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3">
                      <Label className="text-xs text-slate-400">Otro Monto (Múltiplos de $10.000 COP)</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          type="number"
                          step="10000"
                          placeholder="Ej: 300000"
                          value={otroValor}
                          onChange={(e) => setOtroValor(e.target.value)}
                          className="h-9 text-sm font-mono bg-black/40 border-cyan-500/40 text-cyan-200"
                        />
                        <Button
                          disabled={loading || !otroValor}
                          onClick={() => handleSeleccionarMonto(parseFloat(otroValor))}
                          className="h-9 px-4 bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white"
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm" onClick={volverAlMenu}>
                      ← Volver al Menú
                    </Button>
                  </div>
                </div>
              )}

              {/* VISTA 2.1: CONFIRMACIÓN DEL RETIRO CON BOTÓN DE RETIRAR */}
              {pantalla === "confirmar_retiro" && (
                <div className="py-2 max-w-md mx-auto text-center space-y-4">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                    <DollarSign className="h-7 w-7" />
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold text-cyan-300">
                      Confirmación de Retiro en Efectivo
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Verifique los datos de la transacción antes de que el cajero dispense el dinero
                    </p>
                  </div>

                  {/* FICHA TÉRMICA DE CONFIRMACIÓN */}
                  <div className="rounded-2xl border border-cyan-500/40 bg-black/60 p-4 text-xs font-mono space-y-2.5 text-left shadow-lg">
                    <div className="flex justify-between items-center text-sm border-b border-cyan-500/30 pb-2">
                      <span className="text-slate-400 font-sans">Monto Solicitado:</span>
                      <span className="font-bold text-2xl text-emerald-400">{fmt(montoARetirar)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Cuenta de Origen:</span>
                      <span className="text-slate-200">
                        •••• •••• {cuentaInfo?.numero_cuenta ? cuentaInfo.numero_cuenta.slice(-4) : "1053"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Saldo Actual Disponible:</span>
                      <span className="text-slate-200">{fmt(cuentaInfo?.saldo || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Saldo Después del Retiro:</span>
                      <span className="text-cyan-300 font-bold">
                        {fmt(Math.max(0, (cuentaInfo?.saldo || 0) - montoARetirar))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-cyan-500/30 pt-2 text-[11px]">
                      <span className="text-slate-400 font-sans">Costo de Operación:</span>
                      <span className="text-emerald-400 font-bold">$ 0 COP (Sin Costo)</span>
                    </div>
                  </div>

                  {/* CAJA OBLIGATORIA: AUTORIZACIÓN CON CÓDIGO OTP */}
                  <div className="rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-b from-[#091833] to-[#050c18] p-4 text-center space-y-3 shadow-xl">
                    <div className="flex items-center justify-center gap-2 text-cyan-300">
                      <KeyRound className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-xs uppercase tracking-wider">
                        Código de Retiro OTP (6 Dígitos)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      Ingresa el código temporal generado en <span className="font-bold text-white">Banca Rota</span> desde "Sacar plata" para autorizar el dispensador:
                    </p>

                    <div className="max-w-[260px] mx-auto space-y-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={codigoOtpRetiro}
                        onChange={(e) => setCodigoOtpRetiro(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        className="font-mono text-center tracking-[0.6em] text-3xl font-black bg-black/80 border-2 border-cyan-400 text-cyan-300 h-13 shadow-inner focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/40"
                        autoFocus
                      />

                      {/* AYUDA RÁPIDA: PEGAR O CARGAR CÓDIGO */}
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (navigator.clipboard && window.isSecureContext) {
                                const text = await navigator.clipboard.readText();
                                const clean = text.replace(/\D/g, "").slice(0, 6);
                                if (clean) {
                                  setCodigoOtpRetiro(clean);
                                  toast.success(`Código pegado: ${clean}`);
                                  return;
                                }
                              }
                            } catch (e) {}

                            const params = new URLSearchParams(window.location.search);
                            const cod = params.get("codigo");
                            if (cod) {
                              setCodigoOtpRetiro(cod);
                              toast.success(`Código cargado: ${cod}`);
                            } else {
                              toast.info("Pega el código de 6 dígitos que copiaste en Banca Rota.");
                            }
                          }}
                          className="text-[11px] font-semibold text-cyan-300 hover:text-white underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <KeyRound className="h-3 w-3" />
                          Pegar código de Banca Rota
                        </button>
                      </div>
                    </div>

                    {/* TECLADO NUMÉRICO TÁCTIL EN PANTALLA */}
                    <div className="pt-1">
                      <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              if (codigoOtpRetiro.length < 6) {
                                setCodigoOtpRetiro((prev) => prev + n.toString());
                              }
                            }}
                            className="h-9 rounded-lg bg-slate-800/90 hover:bg-slate-700 font-mono font-bold text-sm text-white border border-slate-700 active:scale-95 transition-all shadow-sm"
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCodigoOtpRetiro("")}
                          className="h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-[10px] text-rose-300 border border-rose-500/30 active:scale-95 transition-all"
                        >
                          Borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (codigoOtpRetiro.length < 6) {
                              setCodigoOtpRetiro((prev) => prev + "0");
                            }
                          }}
                          className="h-9 rounded-lg bg-slate-800/90 hover:bg-slate-700 font-mono font-bold text-sm text-white border border-slate-700 active:scale-95 transition-all shadow-sm"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodigoOtpRetiro((prev) => prev.slice(0, -1))}
                          className="h-9 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[10px] text-amber-300 border border-amber-500/30 active:scale-95 transition-all"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE CONFIRMACIÓN Y CANCELACIÓN */}
                  <div className="space-y-2.5 pt-2">
                    <Button
                      disabled={loading || !codigoOtpRetiro || (codigoOtpRetiro.length !== 6 && codigoOtpRetiro.length !== 4)}
                      onClick={() => handleRetiro(montoARetirar)}
                      className="h-12 w-full text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-xl shadow-emerald-600/30 gap-2 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                      Confirmar y Dispensar {fmt(montoARetirar)}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => setPantalla("retirar")}
                      className="w-full text-xs text-slate-300 hover:text-white"
                    >
                      ← Cambiar Monto o Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* VISTA 3: ÚLTIMOS MOVIMIENTOS EN CAJERO */}
              {pantalla === "movimientos" && (
                <div className="py-4">
                  <h3 className="font-display text-lg font-bold text-center text-cyan-300">Últimos Movimientos en Pantalla</h3>
                  <div className="mt-4 max-h-60 overflow-y-auto space-y-2 font-mono text-xs pr-1">
                    {movimientos.map((m) => {
                      const esCredito = m.sentido === "CREDITO";
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between border-b border-cyan-500/20 p-2.5 text-slate-200 bg-black/20 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-cyan-200">{m.tipo_operacion || m.descripcion}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(m.fecha_hora).toLocaleDateString("es-CO")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${esCredito ? "text-emerald-400" : "text-rose-400"}`}>
                              {esCredito ? "+" : "-"}{fmt(m.valor)}
                            </span>
                            <p className="text-[10px] text-slate-400">Saldo: {fmt(m.saldo_resultante)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm" onClick={volverAlMenu}>
                      Volver al Menú Principal
                    </Button>
                  </div>
                </div>
              )}

              {/* VISTA 4: VOUCHER / RECIBO DE RETIRO DIGITAL TÉRMICO */}
              {pantalla === "recibo" && recibo && (
                <div className="py-4">
                  {/* PAPEL TÉRMICO CONTINUO DE CAJERO */}
                  <div className="mx-auto max-w-sm bg-white p-6 text-slate-900 rounded-sm shadow-2xl font-mono text-xs border-dashed border-2 border-slate-300">
                    <div className="text-center border-b border-slate-300 pb-3">
                      <p className="font-bold text-base tracking-wider">BANCA ROTA</p>
                      <p className="text-[11px] text-slate-600">RED DE CAJEROS AUTOMÁTICOS ATM</p>
                      <p className="text-[10px] text-slate-500">TERMINAL: ATM-BOG-004 · MANIZALES</p>
                      <p className="text-[10px] text-slate-500">{new Date(recibo.fecha).toLocaleString("es-CO")}</p>
                    </div>

                    <div className="py-3 space-y-1.5 border-b border-slate-300">
                      <div className="flex justify-between">
                        <span>OPERACIÓN:</span>
                        <span className="font-bold">RETIRO EFECTIVO</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MÉTODO:</span>
                        <span className="font-bold text-cyan-800">{recibo.metodo_retiro || "OTP BANCA ROTA"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AUTORIZACIÓN:</span>
                        <span className="font-bold">#{recibo.numero_operacion || recibo.transaccion_id || "1001"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CUENTA:</span>
                        <span>•••• •••• {recibo.numero_cuenta ? recibo.numero_cuenta.slice(-4) : "1053"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VALOR RETIRADO:</span>
                        <span className="font-bold text-sm text-emerald-600">
                          {fmt(parseFloat(recibo.valor_retirado || recibo.valor) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>COSTO TRANSACCIÓN:</span>
                        <span>$ 0 COP</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                        <span>SALDO DISPONIBLE:</span>
                        <span className="text-emerald-700">{fmt(parseFloat(recibo.nuevo_saldo) || 0)}</span>
                      </div>
                    </div>

                    <div className="text-center pt-3 text-[10px] text-slate-600">
                      <p>¡TRANSACCIÓN EXITOSA!</p>
                      <p>VERIFIQUE SU DINERO ANTES DE RETIRARSE</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      variant="outline"
                      className="gap-1.5 text-xs text-slate-200"
                    >
                      <Printer className="h-3.5 w-3.5" /> Imprimir Recibo
                    </Button>
                    <Button
                      size="sm"
                      onClick={volverAlMenu}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                    >
                      Realizar Otra Operación
                    </Button>
                  </div>
                </div>
              )}

              {/* PIE DE PANTALLA ATM */}
              <div className="flex items-center justify-between border-t border-cyan-500/30 pt-3 text-[11px] text-slate-400">
                <span>Sesión Protegida por Cifrado SHA-256</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-rose-400 hover:underline font-semibold"
                >
                  Expulsar Tarjeta
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
