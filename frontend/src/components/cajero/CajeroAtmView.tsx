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
  const [cuentaInfo, setCuentaInfo] = useState<any>(null);

  // Estados de pantalla del cajero: 'menu' | 'saldo' | 'retirar' | 'movimientos' | 'recibo'
  const [pantalla, setPantalla] = useState<"menu" | "saldo" | "retirar" | "movimientos" | "recibo">("menu");
  const [recibo, setRecibo] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [otroValor, setOtroValor] = useState("");

  // Verificar sesión existente en cajero
  useEffect(() => {
    checkSesion();
  }, []);

  const checkSesion = async () => {
    try {
      const res = await fetch("/api/cajero/saldo", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCuentaInfo(data.cuenta);
        setAutenticado(true);
      }
    } catch (err) {
      // No hay sesión
    }
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

    try {
      setLoading(true);
      const res = await fetch("/api/cajero/retirar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor }),
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
    if (pin.length < 4) {
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
              <p className="text-xs text-muted-foreground">Terminal Red Los Andes · ATM-BOG-004 · Manizales</p>
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
          /* PANTALLA DE INSERTAR TARJETA / LOGIN ATM */
          <div className="mx-auto max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
            
            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <CreditCard className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">Inserte su Tarjeta</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Simulador de Cajero ATM con autenticación mediante PIN de 4 dígitos
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="num-cuenta" className="text-xs">Número de Cuenta / Tarjeta</Label>
                  <Input
                    id="num-cuenta"
                    value={cuentaNumero}
                    onChange={(e) => setCuentaNumero(e.target.value)}
                    placeholder="400110203040"
                    className="mt-1 font-mono text-center tracking-widest text-lg bg-black/40 border-cyan-500/40 text-cyan-300"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pin-cajero" className="text-xs">PIN Secreto (4 Dígitos)</Label>
                  <Input
                    id="pin-cajero"
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="mt-1 font-mono text-center tracking-[1em] text-2xl bg-black/40 border-cyan-500/40 text-cyan-300"
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
                  className="w-full gap-2 mt-4 h-11 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Validar Tarjeta y PIN
                </Button>

                {/* ACCESO RÁPIDO PARA PRUEBAS */}
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs">
                  <p className="font-semibold text-cyan-300">Tus Credenciales de Cajero:</p>
                  <p className="mt-1">Cuenta / Tarjeta: <span className="font-mono text-foreground font-bold">400150181053</span></p>
                  <p>Cédula: <span className="font-mono text-foreground font-bold">1130766219</span></p>
                  <p>PIN ATM: <span className="font-mono text-cyan-300 font-bold">1234</span> (Jairo Pai)</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCuentaNumero("400150181053");
                      setPin("1234");
                    }}
                    className="mt-2 w-full rounded-lg bg-cyan-500/20 py-1.5 text-center text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                  >
                    ⚡ Cargar Tarjeta de Jairo Pai
                  </button>
                </div>
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
                  <span className="font-mono text-xs uppercase text-cyan-400">ATM EN LÍNEA · RED LOS ANDES</span>
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

              {/* VISTA 2: RETIRO RÁPIDO Y MONTOS PREDEFINIDOS */}
              {pantalla === "retirar" && (
                <div className="py-4">
                  <h3 className="font-display text-lg font-bold text-center text-cyan-300">Seleccione el Monto a Retirar</h3>
                  <p className="text-xs text-center text-slate-400 mb-6">Saldo actual: {fmt(cuentaInfo?.saldo || 0)}</p>

                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {[50000, 100000, 200000, 400000].map((monto) => (
                      <Button
                        key={monto}
                        disabled={loading || monto > (cuentaInfo?.saldo || 0)}
                        onClick={() => handleRetiro(monto)}
                        className="h-14 font-mono font-bold text-base bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-800 text-cyan-200"
                      >
                        {fmt(monto)}
                      </Button>
                    ))}

                    <div className="col-span-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3">
                      <Label className="text-xs text-slate-400">Otro Monto (Múltiplos de $10.000)</Label>
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
                          onClick={() => handleRetiro(parseFloat(otroValor))}
                          className="h-9 px-4 bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs"
                        >
                          Dispensar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm" onClick={() => setPantalla("menu")}>
                      Volver al Menú
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
                    <Button variant="outline" size="sm" onClick={() => setPantalla("menu")}>
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
                      <p className="font-bold text-base tracking-wider">BANCA VERDE</p>
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
                        <span>AUTORIZACIÓN:</span>
                        <span className="font-bold">#{recibo.numero_operacion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CUENTA:</span>
                        <span>•••• •••• {recibo.numero_cuenta.slice(-4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VALOR RETIRADO:</span>
                        <span className="font-bold text-sm">{fmt(recibo.valor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COSTO TRANSACCIÓN:</span>
                        <span>$ 0 COP</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                        <span>SALDO DISPONIBLE:</span>
                        <span>{fmt(recibo.nuevo_saldo)}</span>
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
                      onClick={() => setPantalla("menu")}
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
