import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface AdminConsignacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsignar: (cuenta: string, valor: string, concepto: string) => Promise<any>;
}

export function AdminConsignacionModal({
  open,
  onOpenChange,
  onConsignar,
}: AdminConsignacionModalProps) {
  const [cuenta, setCuenta] = useState("400110203040");
  const [monto, setMonto] = useState("100000");
  const [concepto, setConcepto] = useState("Consignación de prueba académica");
  const [loading, setLoading] = useState(false);
  const [recibo, setRecibo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const rec = await onConsignar(cuenta, monto, concepto);
    setLoading(false);
    if (rec) {
      setRecibo(rec);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Consignación en Ventanilla</DialogTitle>
            <DialogDescription>
              Depósito en efectivo directo a la cuenta bancaria del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Número de Cuenta Destino</Label>
              <Input
                value={cuenta}
                onChange={(e) => setCuenta(e.target.value)}
                placeholder="400110203040"
                required
                className="mt-1 font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cuenta de prueba del docente:{" "}
                <button
                  type="button"
                  onClick={() => setCuenta("400110203040")}
                  className="text-accent underline"
                >
                  400110203040 (Andrés)
                </button>
              </p>
            </div>

            <div>
              <Label className="text-xs">Monto a Consignar (COP)</Label>
              <Input
                type="number"
                step="1000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="mt-1 font-mono text-lg font-bold"
              />
              <div className="mt-1 flex gap-2">
                {[50000, 100000, 200000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMonto(v.toString())}
                    className="rounded bg-secondary px-2 py-0.5 text-[11px] hover:bg-secondary/80 font-mono"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Concepto / Referencia</Label>
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Efectuar Depósito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL RECIBO DE CONSIGNACIÓN */}
      <Dialog open={!!recibo} onOpenChange={() => setRecibo(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-xl text-center">¡Depósito Exitoso!</DialogTitle>
            <DialogDescription className="text-center">
              Comprobante de ventanilla registrado en MySQL.
            </DialogDescription>
          </DialogHeader>

          {recibo && (
            <div className="space-y-2 rounded-lg border border-border/80 bg-secondary/30 p-4 text-xs font-mono">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Operación:</span>
                <span className="font-bold">#{recibo.numero_operacion}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{new Date(recibo.fecha).toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Cuenta:</span>
                <span>{recibo.numero_cuenta}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Titular:</span>
                <span className="font-semibold text-foreground">{recibo.titular}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Valor Depositado:</span>
                <span className="font-bold text-emerald-400">{fmt(recibo.valor)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-muted-foreground">Nuevo Saldo:</span>
                <span className="text-cyan-400">{fmt(recibo.nuevo_saldo)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setRecibo(null)} className="w-full">
              Cerrar Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
