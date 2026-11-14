import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, CheckCircle2, RefreshCw, Printer, UserCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminVentanillaViewProps {
  onConsignar: (cuenta: string, valor: string, concepto: string) => Promise<any>;
}

export function AdminVentanillaView({ onConsignar }: AdminVentanillaViewProps) {
  const [cuenta, setCuenta] = useState("");
  const [monto, setMonto] = useState("100000");
  const [concepto, setConcepto] = useState("Consignación en efectivo por ventanilla");
  const [loading, setLoading] = useState(false);
  const [recibo, setRecibo] = useState<any>(null);

  const cuentasSugeridas = [
    { nombre: "Andrés Pai", cuenta: "400110203040", doc: "1001234567" },
    { nombre: "Valentina Gómez", cuenta: "500190807060", doc: "1002345678" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuenta.trim()) {
      toast.error("Ingrese o seleccione el número de cuenta.");
      return;
    }
    const val = parseFloat(monto);
    if (isNaN(val) || val <= 0) {
      toast.error("El valor a consignar debe ser mayor a cero.");
      return;
    }

    setLoading(true);
    const rec = await onConsignar(cuenta.trim(), monto, concepto);
    setLoading(false);
    if (rec) {
      setRecibo(rec);
      toast.success("¡Consignación aplicada con éxito!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="font-display text-2xl font-bold text-white">Ventanilla de Caja y Depósitos</h2>
        <p className="text-xs text-slate-400">
          Inyección directa de fondos en efectivo a cuentas bancarias con emisión de comprobante de caja.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FORMULARIO DE CONSIGNACIÓN */}
        <div className="rounded-2xl border border-slate-800 bg-[#0e1626] p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Recepción de Efectivo</h3>
              <p className="text-xs text-slate-400">Canal 3: Ventanilla Administrativa Central</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300">Número de Cuenta Destino *</Label>
              <Input
                value={cuenta}
                onChange={(e) => setCuenta(e.target.value)}
                placeholder="Ej: 400110203040"
                required
                className="mt-1 font-mono text-sm bg-slate-900 border-slate-700 text-cyan-300 tracking-wider"
              />

              {/* CUENTAS SUGERIDAS */}
              <div className="mt-2.5">
                <span className="text-[11px] text-slate-400 font-medium">Cuentas activas del sistema:</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {cuentasSugeridas.map((c) => (
                    <button
                      key={c.cuenta}
                      type="button"
                      onClick={() => setCuenta(c.cuenta)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all ${
                        cuenta === c.cuenta
                          ? "border-emerald-500 bg-emerald-500/20 text-white"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80"
                      }`}
                    >
                      <UserCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                      <div className="truncate">
                        <p className="font-semibold truncate text-white">{c.nombre}</p>
                        <p className="font-mono text-[10px] text-slate-400">{c.cuenta}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Valor en Efectivo a Consignar (COP) *</Label>
              <Input
                type="number"
                step="5000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="mt-1 font-mono text-lg font-bold bg-slate-900 border-slate-700 text-emerald-400"
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {[50000, 100000, 200000, 500000, 1000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMonto(v.toString())}
                    className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-colors ${
                      monto === v.toString()
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-slate-800/90 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Concepto del Depósito</Label>
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="mt-1 text-xs bg-slate-900 border-slate-700"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <DollarSign className="h-4 w-4" /> Aplicar Consignación en Ventanilla
            </Button>
          </form>
        </div>

        {/* RECIBO / COMPROBANTE OFICIAL DE CAJA */}
        <div className="space-y-4">
          {recibo ? (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-[#09101d] p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-display font-bold text-white text-base">Banco Andino — Comprobante</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" /> Imprimir
                </button>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">No. Transacción:</span>
                  <span className="font-bold text-white">#{recibo.transaccion_id || recibo.numero_operacion || "001"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Fecha y Hora:</span>
                  <span className="text-slate-200">{new Date(recibo.fecha || Date.now()).toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Canal / Terminal:</span>
                  <span className="text-slate-200">Ventanilla 01 — Sede Principal</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Cuenta Destino:</span>
                  <span className="font-bold text-cyan-400">{recibo.numero_cuenta}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Titular de la Cuenta:</span>
                  <span className="font-bold text-white">{recibo.titular}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Monto Depositado:</span>
                  <span className="font-bold text-emerald-400 text-sm">{fmt(recibo.valor_consignado || recibo.valor || parseFloat(monto))}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-emerald-500/10 px-2 rounded-lg border border-emerald-500/20 font-bold">
                  <span className="text-emerald-300">Nuevo Saldo en Cuenta:</span>
                  <span className="text-emerald-300 text-base">{fmt(recibo.nuevo_saldo)}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800">
                Transacción procesada y auditada bajo motor transaccional MySQL InnoDB (ACID).
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#09101d]/50 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-3 rounded-full bg-slate-900 text-slate-500 mb-3">
                <DollarSign className="h-8 w-8" />
              </div>
              <h4 className="font-display font-semibold text-slate-300 text-sm">Esperando Transacción</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Al procesar una consignación, se generará aquí el comprobante oficial de caja con el nuevo saldo resultante.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
