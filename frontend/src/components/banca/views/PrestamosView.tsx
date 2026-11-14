import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Calculator, CheckCircle2, ShieldCheck, Sparkles,
  ArrowRight, Landmark, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface CreditoActivo {
  numero: string;
  nombre: string;
  montoOriginal: number;
  saldoPendiente: number;
  cuotaMensual: number;
  plazoMeses: number;
  proximoVencimiento: string;
}

export function PrestamosView() {
  const [montoSimulado, setMontoSimulado] = useState(10000000);
  const [plazoMeses, setPlazoMeses] = useState(36);
  const tasaMensual = 0.0125; // 1.25% M.V. (16.08% E.A.)

  // Cuota fija con fórmula de amortización: C = P * (i * (1+i)^n) / ((1+i)^n - 1)
  const factor = Math.pow(1 + tasaMensual, plazoMeses);
  const cuotaMensual = Math.round(montoSimulado * (tasaMensual * factor) / (factor - 1));
  const totalPagar = cuotaMensual * plazoMeses;
  const totalIntereses = totalPagar - montoSimulado;

  // Estado limpio: por defecto el cliente NO tiene deudas ni créditos activos
  const [creditoActivo, setCreditoActivo] = useState<CreditoActivo | null>(null);

  const handleSolicitarCredito = () => {
    const nuevoCredito: CreditoActivo = {
      numero: `7890-${Math.floor(1000 + Math.random() * 9000)}`,
      nombre: "Libre Inversión Digital",
      montoOriginal: montoSimulado,
      saldoPendiente: montoSimulado,
      cuotaMensual: cuotaMensual,
      plazoMeses: plazoMeses,
      proximoVencimiento: "25 Dic 2026",
    };
    setCreditoActivo(nuevoCredito);
    toast.success(`¡Crédito por ${fmt(montoSimulado)} preaprobado y habilitado exitosamente!`);
  };

  const handlePagarCuota = () => {
    if (!creditoActivo) return;
    if (creditoActivo.saldoPendiente <= 0) {
      toast.info("Tu crédito ya se encuentra totalmente cancelado.");
      return;
    }
    const nuevoSaldo = Math.max(0, creditoActivo.saldoPendiente - creditoActivo.cuotaMensual);
    if (nuevoSaldo === 0) {
      toast.success("¡Felicitaciones! Has cancelado la totalidad de tu crédito.");
      setCreditoActivo(null);
    } else {
      setCreditoActivo({
        ...creditoActivo,
        saldoPendiente: nuevoSaldo,
      });
      toast.success(`Pago de cuota por ${fmt(creditoActivo.cuotaMensual)} aplicado exitosamente.`);
    }
  };

  const handleCancelarCredito = () => {
    setCreditoActivo(null);
    toast.info("Crédito cancelado. Tu estado financiero vuelve a estar en ceros.");
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-border/60 pb-4">
        <h2 className="font-display text-2xl font-bold">Créditos y Préstamos</h2>
        <p className="text-xs text-muted-foreground">
          Consulta el estado de tus obligaciones crediticias y simula créditos de libre inversión con tasa preferencial.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* COLUMNA IZQUIERDA: ESTADO DE CRÉDITO DEL CLIENTE */}
        {creditoActivo ? (
          <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-mono">
                  Crédito No. {creditoActivo.numero}
                </span>
                <h3 className="font-display text-xl font-bold mt-0.5">{creditoActivo.nombre}</h3>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                AL DÍA
              </span>
            </div>

            <div className="rounded-xl border border-primary/30 bg-secondary/30 p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Saldo Pendiente de Capital:</span>
                <span className="font-display text-2xl font-bold text-white">
                  {fmt(creditoActivo.saldoPendiente)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-2">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      ((creditoActivo.montoOriginal - creditoActivo.saldoPendiente) /
                        creditoActivo.montoOriginal) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-right font-mono">
                {Math.round(
                  ((creditoActivo.montoOriginal - creditoActivo.saldoPendiente) /
                    creditoActivo.montoOriginal) *
                    100
                )}
                % amortizado del préstamo ({fmt(creditoActivo.montoOriginal)})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-[11px] text-muted-foreground font-sans">Valor Cuota Mensual</p>
                <p className="font-bold text-base text-cyan-300 mt-1">
                  {fmt(creditoActivo.cuotaMensual)}
                </p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-[11px] text-muted-foreground font-sans">Próximo Vencimiento</p>
                <p className="font-bold text-base text-slate-100 mt-1">
                  {creditoActivo.proximoVencimiento}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handlePagarCuota}
                className="w-full h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              >
                Pagar Cuota Mensual ({fmt(creditoActivo.cuotaMensual)})
              </Button>
              <button
                type="button"
                onClick={handleCancelarCredito}
                className="w-full text-center text-[11px] text-slate-400 hover:text-rose-400 transition-colors py-1"
              >
                Desistir o liquidar este crédito
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO LIMPIO: SIN DEUDAS */
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="space-y-1 max-w-sm">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 inline-block mb-1">
                ● SIN OBLIGACIONES ACTIVAS
              </span>
              <h3 className="font-display text-xl font-bold text-white">Estás 100% al día</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No registras deudas de libre inversión, libranzas ni cuotas pendientes por pagar. Tu historial bancario está limpio y disponible.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs space-y-2 font-mono text-left">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Capacidad de Endeudamiento:</span>
                <span className="text-emerald-400 font-bold">Disponible</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/40 pt-1.5">
                <span className="text-muted-foreground font-sans">Score Crediticio:</span>
                <span className="text-cyan-300 font-bold">780 / 950 (A+)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs">
              ¿Requieres financiación para un proyecto personal? Usa el simulador para consultar tu cuota estimada.
            </p>
          </div>
        )}

        {/* COLUMNA DERECHA: SIMULADOR DE CRÉDITO */}
        <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-accent" />
            <h3 className="font-display text-xl font-bold">Simulador de Crédito</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* MONTO */}
            <div>
              <div className="flex justify-between font-semibold">
                <span>Monto a Solicitar:</span>
                <span className="font-mono text-cyan-300 text-sm">{fmt(montoSimulado)}</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="50000000"
                step="1000000"
                value={montoSimulado}
                onChange={(e) => setMontoSimulado(parseFloat(e.target.value))}
                className="w-full mt-2 accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>$ 1.000.000</span>
                <span>$ 50.000.000</span>
              </div>
            </div>

            {/* PLAZO */}
            <div>
              <div className="flex justify-between font-semibold">
                <span>Plazo en Meses:</span>
                <span className="font-mono text-cyan-300 text-sm">
                  {plazoMeses} meses ({Math.round(plazoMeses / 12)} años)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {[12, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlazoMeses(m)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                      plazoMeses === m
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* RESULTADO DE LA SIMULACIÓN */}
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground font-medium">Cuota Mensual Estimada:</span>
                <span className="font-mono font-bold text-accent text-xl">{fmt(cuotaMensual)}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                <span>Tasa Interés Mes Vencido:</span>
                <span className="font-mono font-semibold text-foreground">1.25% M.V. (16.08% E.A.)</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Total Intereses al Finalizar:</span>
                <span className="font-mono font-semibold text-foreground">{fmt(totalIntereses)}</span>
              </div>
            </div>

            <Button
              onClick={handleSolicitarCredito}
              className="w-full h-11 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              Solicitar Preaprobado en Línea
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
