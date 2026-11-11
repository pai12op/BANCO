import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Landmark, Calculator, CheckCircle2, DollarSign, Calendar, Percent } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function PrestamosView() {
  const [montoSimulado, setMontoSimulado] = useState(10000000);
  const [plazoMeses, setPlazoMeses] = useState(36);
  const tasaMensual = 0.0125; // 1.25% M.V. (16.08% E.A.)

  // Cuota fija con fórmula de amortización: C = P * (i * (1+i)^n) / ((1+i)^n - 1)
  const factor = Math.pow(1 + tasaMensual, plazoMeses);
  const cuotaMensual = Math.round(montoSimulado * (tasaMensual * factor) / (factor - 1));
  const totalPagar = cuotaMensual * plazoMeses;
  const totalIntereses = totalPagar - montoSimulado;

  const [saldoPendiente, setSaldoPendiente] = useState(8450000);

  const handlePagarCuota = () => {
    if (saldoPendiente <= 0) {
      toast.info("Tu crédito ya se encuentra totalmente cancelado.");
      return;
    }
    setSaldoPendiente(Math.max(0, saldoPendiente - 485000));
    toast.success("Pago de cuota por $485.000 COP aplicado exitosamente a tu crédito.");
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
        {/* CRÉDITO ACTIVO */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-mono">Crédito No. 7890-4421</span>
              <h3 className="font-display text-xl font-bold mt-0.5">Libre Inversión Personal</h3>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              AL DÍA
            </span>
          </div>

          <div className="rounded-xl border border-primary/30 bg-secondary/30 p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Saldo Pendiente de Capital:</span>
              <span className="font-display text-2xl font-bold text-white">{fmt(saldoPendiente)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${Math.round(((15000000 - saldoPendiente) / 15000000) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-right">
              {Math.round(((15000000 - saldoPendiente) / 15000000) * 100)}% amortizado del préstamo original ($15.000.000)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground font-sans">Valor Cuota Mensual</p>
              <p className="font-bold text-base text-cyan-300 mt-1">$ 485.000 COP</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground font-sans">Próximo Vencimiento</p>
              <p className="font-bold text-base text-slate-100 mt-1">25 Nov 2026</p>
            </div>
          </div>

          <Button
            onClick={handlePagarCuota}
            className="w-full h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
          >
            Pagar Cuota Mensual ($ 485.000 COP)
          </Button>
        </div>

        {/* SIMULADOR EN TIEMPO REAL */}
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
                <span className="font-mono text-cyan-300 text-sm">{plazoMeses} meses ({Math.round(plazoMeses / 12)} años)</span>
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
              onClick={() => toast.success("¡Solicitud preaprobada! Un asesor se contactará para la firma digital de pagaré.")}
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
