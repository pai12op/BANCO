import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard, Landmark, Receipt, ArrowLeftRight, ShieldCheck,
  CheckCircle2, AlertTriangle, RefreshCw, LogOut, DollarSign,
  ArrowDownLeft, ArrowUpRight, KeyRound
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface CajeroAtmProps {
  onSwitchModule?: (mod: string) => void;
}

export function CajeroAtmView({ onSwitchModule }: CajeroAtmProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cuentaNumero, setCuentaNumero] = useState("400110203040");
  const [pin, setPin] = useState("1234");
  const [cuentaInfo, setCuentaInfo] = useState<any>(null);

  // Estados de pantalla del cajero
  // 'menu' | 'saldo' | 'retirar' | 'movimientos' | 'recibo'
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

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* HEADER ATM */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Cajero Automático ATM</h1>
              <p className="text-xs text-muted-foreground">Terminal Red Los Andes · ATM-BOG-004</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchModule?.("banca")}
              className="gap-1.5 text-xs border-border"
            >
              <Landmark className="h-3.5 w-3.5" /> Ir a Banca Virtual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchModule?.("admin")}
              className="gap-1.5 text-xs border-border"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Ir a Panel Admin
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENEDOR DEL CAJERO ESTILO HARDWARE */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!autenticado ? (
          /* PANTALLA DE INSERTAR TARJETA / LOGIN ATM */
          <div className="mx-auto max-w-md rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/20 text-primary">
                <CreditCard className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold">Inserte su Tarjeta</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Simulador ATM conectado en tiempo real a MySQL
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
                  className="mt-1 font-mono text-center tracking-widest text-lg"
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
                  className="mt-1 font-mono text-center tracking-widest text-2xl"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2 h-11 text-sm font-semibold">
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Ingresar al Cajero
              </Button>

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs">
                <p className="font-semibold text-primary">Prueba Mínima del Docente (Pág. 9-10):</p>
                <p className="mt-1 text-muted-foreground">
                  Cuenta: <span className="font-mono text-foreground font-semibold">400110203040</span> (Andrés Pai)
                </p>
                <p className="text-muted-foreground">
                  PIN: <span className="font-mono text-foreground font-semibold">1234</span>
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* CAJERO EN SESIÓN ACTIVA */
          <div className="rounded-3xl border-4 border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl ring-1 ring-white/10">
            {/* PANTALLA LCD DEL CAJERO */}
            <div className="rounded-2xl border-2 border-cyan-500/30 bg-[#06121e] p-6 shadow-[inset_0_0_30px_rgba(6,182,212,0.1)]">
              {/* HEADER DE LA PANTALLA */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 text-xs text-cyan-400">
                <span className="font-mono font-bold tracking-wider">BANCO ANDINO ATM</span>
                <span className="font-mono">CUENTA: {cuentaInfo?.numero_cuenta}</span>
              </div>

              {/* CONTENIDO SEGÚN SUB-PANTALLA */}
              {pantalla === "menu" && (
                <div className="py-6">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-cyan-400/80">Bienvenido al sistema</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-slate-100">
                      {cuentaInfo?.titular || "Andrés Pai Guanga"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">Seleccione la operación que desea realizar:</p>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setPantalla("saldo")}
                      className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-left text-sm font-semibold text-cyan-200 transition-all hover:border-cyan-400 hover:bg-cyan-900/50"
                    >
                      <span>1. Consultar Saldo</span>
                      <DollarSign className="h-5 w-5 text-cyan-400" />
                    </button>

                    <button
                      onClick={() => setPantalla("retirar")}
                      className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-left text-sm font-semibold text-cyan-200 transition-all hover:border-cyan-400 hover:bg-cyan-900/50"
                    >
                      <span>2. Retirar Efectivo</span>
                      <Receipt className="h-5 w-5 text-cyan-400" />
                    </button>

                    <button
                      onClick={cargarMovimientos}
                      className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-left text-sm font-semibold text-cyan-200 transition-all hover:border-cyan-400 hover:bg-cyan-900/50"
                    >
                      <span>3. Últimos Movimientos</span>
                      <ArrowLeftRight className="h-5 w-5 text-cyan-400" />
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-left text-sm font-semibold text-red-300 transition-all hover:border-red-400 hover:bg-red-900/40"
                    >
                      <span>4. Expulsar Tarjeta</span>
                      <LogOut className="h-5 w-5 text-red-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* VISTA 1: CONSULTAR SALDO */}
              {pantalla === "saldo" && (
                <div className="py-8 text-center">
                  <p className="text-xs uppercase tracking-widest text-cyan-400">Saldo Actual en Cuenta</p>
                  <p className="mt-3 font-display text-4xl font-bold text-emerald-400">
                    {fmt(cuentaInfo?.saldo || 0)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Tipo: Cuenta de {cuentaInfo?.tipo_cuenta || "Ahorros"}</p>

                  <div className="mt-8 flex justify-center gap-3">
                    <Button
                      onClick={() => setPantalla("retirar")}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      Ir a Retirar
                    </Button>
                    <Button variant="outline" onClick={() => setPantalla("menu")}>
                      Volver al Menú
                    </Button>
                  </div>
                </div>
              )}

              {/* VISTA 2: RETIRAR EFECTIVO */}
              {pantalla === "retirar" && (
                <div className="py-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-slate-100">Seleccione el Monto a Retirar</h3>
                    <p className="text-xs text-cyan-400 mt-1">Saldo Disponible: {fmt(cuentaInfo?.saldo || 0)}</p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[50000, 100000, 200000, 300000, 400000].map((v) => (
                      <button
                        key={v}
                        disabled={loading}
                        onClick={() => handleRetiro(v)}
                        className={`rounded-xl border p-4 text-center font-bold text-sm transition-all ${
                          v === 200000
                            ? "border-emerald-400 bg-emerald-950/60 text-emerald-300 ring-2 ring-emerald-500/30"
                            : "border-cyan-500/30 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/60"
                        }`}
                      >
                        <p>{fmt(v)}</p>
                        {v === 200000 && (
                          <span className="text-[10px] text-emerald-400 block mt-1">★ Prueba Docente</span>
                        )}
                      </button>
                    ))}

                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2.5">
                      <Label className="text-[10px] text-slate-400">Otro Monto (Múltiplo 10k)</Label>
                      <div className="flex gap-1.5 mt-1">
                        <Input
                          type="number"
                          step="10000"
                          placeholder="Monto"
                          value={otroValor}
                          onChange={(e) => setOtroValor(e.target.value)}
                          className="h-8 text-xs font-mono bg-black/40"
                        />
                        <Button
                          size="sm"
                          disabled={loading || !otroValor}
                          onClick={() => handleRetiro(parseFloat(otroValor))}
                          className="h-8 px-2 bg-cyan-600 text-xs"
                        >
                          OK
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm" onClick={() => setPantalla("menu")}>
                      Cancelar y Volver
                    </Button>
                  </div>
                </div>
              )}

              {/* VISTA 3: ÚLTIMOS MOVIMIENTOS EN CAJERO */}
              {pantalla === "movimientos" && (
                <div className="py-4">
                  <h3 className="font-display text-lg font-bold text-center text-cyan-300">Últimos Movimientos</h3>
                  <div className="mt-4 max-h-60 overflow-y-auto space-y-2 font-mono text-xs">
                    {movimientos.map((m) => {
                      const esCredito = m.sentido === "CREDITO";
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between border-b border-cyan-500/20 p-2 text-slate-200"
                        >
                          <div>
                            <p className="font-semibold">{m.tipo_operacion || m.descripcion}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(m.fecha_hora).toLocaleDateString("es-CO")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={esCredito ? "text-emerald-400" : "text-slate-200"}>
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

              {/* VISTA 4: VOUCHER / RECIBO DE RETIRO */}
              {pantalla === "recibo" && recibo && (
                <div className="py-4">
                  {/* SIMULADOR DE PAPEL DE RECIBO DE CAJERO */}
                  <div className="mx-auto max-w-sm bg-white p-5 text-slate-900 rounded-sm shadow-xl font-mono text-xs border-dashed border-2 border-slate-300">
                    <div className="text-center border-b border-slate-300 pb-2">
                      <p className="font-bold text-sm">BANCO ANDINO</p>
                      <p className="text-[10px] text-slate-600">CAJERO AUTOMÁTICO BOG-004</p>
                      <p className="text-[10px] text-slate-500">{new Date(recibo.fecha).toLocaleString("es-CO")}</p>
                    </div>

                    <div className="py-3 space-y-1.5 border-b border-slate-300">
                      <div className="flex justify-between">
                        <span>TRANSACCIÓN:</span>
                        <span className="font-bold">#{recibo.transaccion_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CUENTA:</span>
                        <span>•••• {recibo.numero_cuenta.slice(-4)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm pt-1">
                        <span>VALOR RETIRADO:</span>
                        <span>{fmt(recibo.valor_retirado)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm">
                        <span>NUEVO SALDO:</span>
                        <span className="text-emerald-700">{fmt(recibo.nuevo_saldo)}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-500">
                      <p>COMPROBANTE VÁLIDO DE RETIRO</p>
                      <p>CONSERVE ESTE RECIBO</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={() => setPantalla("menu")} className="bg-cyan-600 hover:bg-cyan-500">
                      Otra Operación
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                      Finalizar y Retirar Tarjeta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
