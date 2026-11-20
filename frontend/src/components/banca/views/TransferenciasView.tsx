import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Send, CheckCircle2, RefreshCw, UserCheck, Receipt, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/formatters";
import { bancaService } from "@/services/bancaService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComprobanteTransferencia, Cuenta, Movimiento } from "../types";

interface PendingTransferConfirm {
  cuenta_origen_id: number;
  cuenta_origen_numero: string;
  numero_cuenta_destino: string;
  titular_destino: string;
  tipo_cuenta_destino: string;
  valor: number;
  impuesto: number;
  total_debitar: number;
  concepto?: string | undefined;
}

const fmt = formatCOP;

interface TransferenciasViewProps {
  cuentaActiva: Cuenta | null;
  saldoReal: number;
  movimientos: Movimiento[];
  onTransferSuccess: () => void;
  onNotify?: (title: string, detail: string) => void;
}

export function TransferenciasView({
  cuentaActiva,
  saldoReal,
  movimientos,
  onTransferSuccess,
  onNotify,
}: TransferenciasViewProps) {
  const [cuentaDestino, setCuentaDestino] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [aplicarGmf, setAplicarGmf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificandoDestino, setVerificandoDestino] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingTransferConfirm | null>(null);
  const [comprobante, setComprobante] = useState<ComprobanteTransferencia | null>(null);

  // Lista dinámica de contactos del equipo
  // Se excluye la cuenta activa del usuario actual para evitar transferencias a sí mismo
  const listaContactos = [
    { nombre: "Cuenta Principal", cuenta: "400110203040", banco: "Banca Rota" },
    { nombre: "Valentina Gómez", cuenta: "500190807060", banco: "Banca Rota" },
    { nombre: "Melisa Pinilla", cuenta: "400122334455", banco: "Banca Rota" },
    { nombre: "Isabella Caviedes", cuenta: "400166778899", banco: "Banca Rota" },
  ];

  const contactosFrecuentes = listaContactos.filter(
    (c) => c.cuenta !== cuentaActiva?.numero_cuenta
  );

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaActiva) {
      toast.error("No se ha seleccionado una cuenta de origen activa.");
      return;
    }

    const valorBase = parseFloat(monto);
    if (isNaN(valorBase) || valorBase <= 0) {
      toast.error("El monto debe ser mayor a $0 COP.");
      return;
    }

    const destinoLimpio = cuentaDestino.trim().replace(/\D/g, "");
    if (!destinoLimpio) {
      toast.error("Ingrese o seleccione el número de cuenta de destino.");
      return;
    }

    if (destinoLimpio === cuentaActiva.numero_cuenta) {
      toast.error("No puede realizar una transferencia a su misma cuenta de origen.");
      return;
    }

    const impuesto = aplicarGmf ? Math.round(valorBase * 0.004) : 0;

    if (valorBase + impuesto > saldoReal) {
      toast.error(`Saldo insuficiente. Saldo disponible: ${fmt(saldoReal)}`);
      return;
    }

    try {
      setVerificandoDestino(true);
      const destinatario = await bancaService.consultarDestinatario(destinoLimpio, cuentaActiva.id);
      const conceptoFinal = concepto.trim()
        ? (impuesto > 0 ? `${concepto.trim()} (GMF 4x1000: ${fmt(impuesto)})` : concepto.trim())
        : (impuesto > 0 ? `Transferencia (GMF 4x1000: ${fmt(impuesto)})` : undefined);

      setPendingConfirm({
        cuenta_origen_id: cuentaActiva.id,
        cuenta_origen_numero: cuentaActiva.numero_cuenta,
        numero_cuenta_destino: destinatario.numero_cuenta,
        titular_destino: destinatario.titular,
        tipo_cuenta_destino: destinatario.tipo_cuenta,
        valor: valorBase,
        impuesto,
        total_debitar: valorBase + impuesto,
        concepto: conceptoFinal,
      });
    } catch (err: any) {
      toast.error(err?.message || "No se pudo verificar la cuenta destino.");
    } finally {
      setVerificandoDestino(false);
    }
  };

  const handleConfirmarTransferencia = async () => {
    if (!pendingConfirm) return;
    try {
      setLoading(true);
      const data = await bancaService.transferir({
        cuenta_origen_id: pendingConfirm.cuenta_origen_id,
        numero_cuenta_destino: pendingConfirm.numero_cuenta_destino,
        valor: pendingConfirm.valor,
        concepto: pendingConfirm.concepto,
      });

      const detalleExito = `Enviaste ${fmt(pendingConfirm.valor)} a ${pendingConfirm.titular_destino} (${pendingConfirm.numero_cuenta_destino}).`;
      toast.success("Transferencia exitosa", {
        description: detalleExito,
      });
      setComprobante(data.comprobante);
      setPendingConfirm(null);
      setMonto("");
      setConcepto("");
      setCuentaDestino("");
      onTransferSuccess();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo realizar la transferencia.");
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
                placeholder="Ej: 400110203040"
                required
                className="mt-1 font-mono text-sm"
              />

              {/* CONTACTOS FRECUENTES */}
              <div className="mt-2.5">
                <span className="text-[11px] text-muted-foreground font-medium">Seleccionar contacto del equipo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                  {contactosFrecuentes.map((c) => {
                    const isSelected = cuentaDestino === c.cuenta;
                    return (
                      <button
                        key={c.cuenta}
                        type="button"
                        onClick={() => setCuentaDestino(c.cuenta)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/20 text-white shadow-sm ring-1 ring-primary/40"
                            : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <UserCheck className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="truncate">
                          <p className="font-semibold truncate text-foreground">{c.nombre}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{c.cuenta}</p>
                        </div>
                      </button>
                    );
                  })}
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
              disabled={loading || verificandoDestino || valorBase <= 0}
              className="w-full gap-2 h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading || verificandoDestino ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {verificandoDestino ? "Verificando destinatario..." : "Continuar y Confirmar Transferencia"}
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

      {/* MODAL DE CONFIRMACIÓN ANTES DE EJECUTAR LA TRANSFERENCIA */}
      <Dialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => {
          if (!open && !loading) setPendingConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#0e1626] border-slate-800 text-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg text-white">
                  Confirmar Transferencia
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Verifica los datos del destinatario antes de autorizar el débito.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {pendingConfirm && (
            <div className="rounded-xl border border-slate-800 bg-[#080f1d] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Titular destino:</span>
                <span className="font-semibold text-white text-right">{pendingConfirm.titular_destino}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Cuenta destino:</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {pendingConfirm.numero_cuenta_destino} ({pendingConfirm.tipo_cuenta_destino})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Cuenta origen:</span>
                <span className="font-mono text-slate-300">{pendingConfirm.cuenta_origen_numero}</span>
              </div>
              <div className="border-t border-slate-800/80 pt-2 flex justify-between gap-2">
                <span className="text-slate-400">Monto a enviar:</span>
                <span className="font-mono font-bold text-white">{fmt(pendingConfirm.valor)}</span>
              </div>
              {pendingConfirm.impuesto > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">GMF (4x1000):</span>
                  <span className="font-mono text-amber-400">+{fmt(pendingConfirm.impuesto)}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 text-sm font-bold pt-1 border-t border-slate-800">
                <span className="text-slate-200">Total a debitar:</span>
                <span className="font-mono text-emerald-400">{fmt(pendingConfirm.total_debitar)}</span>
              </div>
              {pendingConfirm.concepto && (
                <div className="pt-1 text-[11px] text-slate-400">
                  Concepto: <span className="text-slate-200">{pendingConfirm.concepto}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setPendingConfirm(null);
                toast.info("Transferencia cancelada.");
              }}
              className="flex-1 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirmarTransferencia}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Sí, Confirmar Envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
