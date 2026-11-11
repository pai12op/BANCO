import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Send, CheckCircle2, RefreshCw, UserCheck, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ComprobanteTransferencia, Cuenta, Movimiento } from "../types";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface TransferenciasViewProps {
  cuentaActiva: Cuenta | null;
  saldoReal: number;
  movimientos: Movimiento[];
  onTransferSuccess: () => void;
}

export function TransferenciasView({
  cuentaActiva,
  saldoReal,
  movimientos,
  onTransferSuccess,
}: TransferenciasViewProps) {
  const [cuentaDestino, setCuentaDestino] = useState("500190807060");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [aplicarGmf, setAplicarGmf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comprobante, setComprobante] = useState<ComprobanteTransferencia | null>(null);

  const contactosFrecuentes = [
    { nombre: "Valentina Gómez", cuenta: "500190807060", banco: "Banco Digital Andino" },
    { nombre: "Mateo Restrepo", cuenta: "400155667788", banco: "Banco Digital Andino" },
  ];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaActiva) return;

    const valorBase = parseFloat(monto);
    if (isNaN(valorBase) || valorBase <= 0) {
      toast.error("El monto debe ser mayor a $0.");
      return;
    }

    const impuesto = aplicarGmf ? Math.round(valorBase * 0.004) : 0;
    const valor = valorBase + impuesto;

    if (valor > saldoReal) {
      toast.error(`Saldo insuficiente. Saldo disponible: ${fmt(saldoReal)}`);
      return;
    }

    if (!cuentaDestino.trim()) {
      toast.error("Ingrese el número de cuenta de destino.");
      return;
    }

    try {
      setLoading(true);
      const conceptoFinal = concepto.trim()
        ? (impuesto > 0 ? `${concepto.trim()} (Incluye GMF 4x1000: ${fmt(impuesto)})` : concepto.trim())
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
      setMonto("");
      setConcepto("");
      onTransferSuccess();
    } catch (err) {
      toast.error("Error al procesar la transferencia.");
    } finally {
      setLoading(false);
    }
  };

  const valorBase = parseFloat(monto) || 0;
  const impuesto4x1000 = aplicarGmf ? Math.round(valorBase * 0.004) : 0;
  const totalDebitado = valorBase + impuesto4x1000;

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-border/60 pb-4">
        <h2 className="font-display text-2xl font-bold">Centro de Transferencias</h2>
        <p className="text-xs text-muted-foreground">
          Envía dinero a cuentas propias y a terceros sin costo de comisión, con cálculo de GMF 4x1000 en tiempo real.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* FORMULARIO DE TRANSFERENCIA */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <form onSubmit={handleTransfer} className="space-y-4">
            {/* CUENTA ORIGEN */}
            <div>
              <Label className="text-xs font-semibold">Cuenta de Origen</Label>
              <div className="mt-1 flex items-center justify-between rounded-xl border border-primary/40 bg-secondary/30 p-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{cuentaActiva?.tipo_cuenta || "Cuenta de Ahorros"}</p>
                  <p className="font-mono text-muted-foreground">{cuentaActiva?.numero_cuenta || "400110203040"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase">Saldo Disponible</span>
                  <p className="font-mono font-bold text-cyan-300 text-sm">{fmt(saldoReal)}</p>
                </div>
              </div>
            </div>

            {/* CUENTA DESTINO */}
            <div>
              <Label className="text-xs font-semibold">Cuenta Bancaria de Destino</Label>
              <Input
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                placeholder="Ej: 500190807060"
                required
                className="mt-1 font-mono text-sm"
              />

              {/* CONTACTOS FRECUENTES */}
              <div className="mt-2">
                <span className="text-[11px] text-muted-foreground">Contactos frecuentes:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {contactosFrecuentes.map((c) => (
                    <button
                      key={c.cuenta}
                      type="button"
                      onClick={() => setCuentaDestino(c.cuenta)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 px-2 py-1 text-[11px] hover:border-accent hover:text-accent transition-colors"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>{c.nombre} ({c.cuenta.slice(-4)})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* MONTO */}
            <div>
              <Label className="text-xs font-semibold">Monto a Transferir (COP)</Label>
              <Input
                type="number"
                step="1000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="100000"
                required
                className="mt-1 font-mono text-lg font-bold"
              />
              <div className="mt-1.5 flex gap-2">
                {[50000, 100000, 200000, 500000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMonto(v.toString())}
                    className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-mono hover:bg-secondary/80 transition-colors"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            {/* CONCEPTO */}
            <div>
              <Label className="text-xs font-semibold">Concepto / Motivo (Opcional)</Label>
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Pago arriendo, almuerzo, cuota..."
                className="mt-1 text-xs"
              />
            </div>

            {/* DESGLOSE 4x1000 GMF */}
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor a transferir:</span>
                <span className="font-mono font-bold">{fmt(valorBase)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gravamen GMF (4x1.000):</span>
                <span className={`font-mono font-bold ${aplicarGmf ? "text-amber-400" : "text-emerald-400"}`}>
                  {aplicarGmf ? `+${fmt(impuesto4x1000)}` : "$ 0 COP (Exenta Art. 879 E.T.)"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2 font-bold">
                <span className="text-foreground">Total a debitar de la cuenta:</span>
                <span className="font-mono text-cyan-300 text-base">{fmt(totalDebitado)}</span>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <label htmlFor="toggle-gmf" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  Simular cuenta no exenta (+ 4x1.000 DIAN)
                </label>
                <input
                  id="toggle-gmf"
                  type="checkbox"
                  checked={aplicarGmf}
                  onChange={(e) => setAplicarGmf(e.target.checked)}
                  className="rounded border-border accent-primary cursor-pointer h-4 w-4"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || valorBase <= 0}
              className="w-full gap-2 h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar Transferencia Inmediata
            </Button>
          </form>
        </div>

        {/* HISTORIAL LATERAL Y VOUCHER */}
        <div className="space-y-4">
          {/* COMPROBANTE DE ÚLTIMA TRANSFERENCIA */}
          {comprobante ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-card p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-display font-bold text-base text-foreground">Transferencia Exitosa</h3>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3.5 font-mono text-xs space-y-1.5 border border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operación #:</span>
                  <span className="font-bold">#{comprobante.numero_operacion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino:</span>
                  <span className="text-cyan-300 font-semibold">{comprobante.cuenta_destino}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="text-emerald-400 font-bold">{fmt(comprobante.valor)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                  <span className="text-muted-foreground">Nuevo Saldo:</span>
                  <span>{fmt(comprobante.nuevo_saldo_origen)}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setComprobante(null)} className="w-full text-xs">
                Cerrar Comprobante
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <h3 className="font-display text-base font-bold">Seguridad en Transferencias</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tus operaciones son procesadas bajo reglas de integridad ACID con aislamiento de transacciones InnoDB, protegiendo tus fondos contra condiciones de carrera.
              </p>
            </div>
          )}

          {/* ÚLTIMAS TRANSFERENCIAS */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <h3 className="font-display text-sm font-bold">Historial de Transferencias</h3>
            <div className="divide-y divide-border/60 text-xs font-mono">
              {movimientos
                .filter((m) => m.tipo_operacion?.toLowerCase().includes("transfe") || m.canal?.toLowerCase().includes("banca"))
                .slice(0, 4)
                .map((m) => (
                  <div key={m.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-sans font-medium text-foreground">{m.descripcion || "Transferencia"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(m.fecha_hora).toLocaleDateString("es-CO")}</p>
                    </div>
                    <span className="font-bold text-rose-400">-{fmt(m.valor)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
