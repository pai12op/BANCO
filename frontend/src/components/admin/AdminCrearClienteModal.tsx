import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminCrearClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrearCliente: (clienteData: any) => Promise<boolean>;
}

export function AdminCrearClienteModal({
  open,
  onOpenChange,
  onCrearCliente,
}: AdminCrearClienteModalProps) {
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo_documento_id: 1,
    numero_documento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    saldo_inicial: "100000",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await onCrearCliente(nuevoCliente);
    setLoading(false);
    if (ok) {
      setNuevoCliente({
        tipo_documento_id: 1,
        numero_documento: "",
        nombres: "",
        apellidos: "",
        correo: "",
        telefono: "",
        saldo_inicial: "100000",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Crea un cliente con cuenta bancaria activa y saldo de apertura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nombres</Label>
              <Input
                value={nuevoCliente.nombres}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                placeholder="Carlos"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Apellidos</Label>
              <Input
                value={nuevoCliente.apellidos}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                placeholder="Ramírez"
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">No. Documento (Cédula)</Label>
              <Input
                value={nuevoCliente.numero_documento}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, numero_documento: e.target.value })}
                placeholder="1009876543"
                required
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Teléfono Móvil</Label>
              <Input
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                placeholder="3119876543"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Correo Electrónico</Label>
            <Input
              type="email"
              value={nuevoCliente.correo}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
              placeholder="carlos@correo.com"
              required
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label className="text-xs">Depósito Inicial de Apertura (COP)</Label>
            <Input
              type="number"
              step="10000"
              value={nuevoCliente.saldo_inicial}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, saldo_inicial: e.target.value })}
              required
              className="mt-1 font-mono font-bold"
            />
          </div>

          <div className="rounded-xl border border-secondary bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
            Se creará automáticamente una cuenta de ahorros, PIN de cajero{" "}
            <span className="font-mono text-foreground font-semibold">1234</span> y contraseña temporal{" "}
            <span className="font-mono text-foreground font-semibold">Banco123*</span>.
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Crear Cliente y Cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
