import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, KeyRound, Shield, Eye, EyeOff, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [formData, setFormData] = useState({
    tipo_documento_id: 1,
    numero_documento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    tipo_cuenta_id: 1,
    saldo_inicial: "1500000",
    password: "",
    pin_cajero: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const generarPasswordSegura = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData((prev) => ({ ...prev, password: pass, pin_cajero: pin }));
    setShowPassword(true);
    toast.info("Contraseña y PIN generados aleatoriamente.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero_documento.trim() || !formData.nombres.trim() || !formData.apellidos.trim() || !formData.correo.trim()) {
      toast.error("Por favor diligencie todos los campos obligatorios.");
      return;
    }

    const pin = formData.pin_cajero.trim() || "1234";
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("El PIN del cajero debe ser de 4 dígitos numéricos.");
      return;
    }

    const pass = formData.password.trim() || "Banco123*";
    if (pass.length < 6) {
      toast.error("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    const ok = await onCrearCliente({
      ...formData,
      password: pass,
      pin_cajero: pin,
      saldo_inicial: parseFloat(formData.saldo_inicial) || 0,
    });
    setLoading(false);

    if (ok) {
      setFormData({
        tipo_documento_id: 1,
        numero_documento: "",
        nombres: "",
        apellidos: "",
        correo: "",
        telefono: "",
        tipo_cuenta_id: 1,
        saldo_inicial: "1500000",
        password: "",
        pin_cajero: "",
      });
      setShowPassword(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0e1626] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl text-white">Apertura de Cuenta Institucional</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Registra un nuevo titular y crea su cuenta bancaria en el sistema central.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {/* IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <Label className="text-xs text-slate-300">Tipo Doc</Label>
              <select
                value={formData.tipo_documento_id}
                onChange={(e) => setFormData({ ...formData, tipo_documento_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              >
                <option value={1}>Cédula (CC)</option>
                <option value={2}>Extranjería (CE)</option>
                <option value={3}>Pasaporte (PAS)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-300">Número de Documento *</Label>
              <Input
                value={formData.numero_documento}
                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                placeholder="1009876543"
                required
                className="mt-1 font-mono text-xs bg-slate-900/80 border-slate-700"
              />
            </div>
          </div>

          {/* NOMBRES Y APELLIDOS */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs text-slate-300">Nombres *</Label>
              <Input
                value={formData.nombres}
                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                placeholder="Carlos Alberto"
                required
                className="mt-1 text-xs bg-slate-900/80 border-slate-700"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Apellidos *</Label>
              <Input
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                placeholder="Ramírez Gómez"
                required
                className="mt-1 text-xs bg-slate-900/80 border-slate-700"
              />
            </div>
          </div>

          {/* CONTACTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs text-slate-300">Correo Electrónico *</Label>
              <Input
                type="email"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                placeholder="carlos@correo.com"
                required
                className="mt-1 font-mono text-xs bg-slate-900/80 border-slate-700"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Teléfono Móvil</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="3119876543"
                className="mt-1 font-mono text-xs bg-slate-900/80 border-slate-700"
              />
            </div>
          </div>

          {/* TIPO DE CUENTA Y SALDO DE APERTURA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs text-slate-300">Tipo de Cuenta</Label>
              <select
                value={formData.tipo_cuenta_id}
                onChange={(e) => setFormData({ ...formData, tipo_cuenta_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              >
                <option value={1}>Cuenta de Ahorros (4001...)</option>
                <option value={2}>Cuenta Corriente (5001...)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Depósito Inicial (COP) *</Label>
              <Input
                type="number"
                step="10000"
                value={formData.saldo_inicial}
                onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value })}
                required
                className="mt-1 font-mono font-bold text-xs bg-slate-900/80 border-slate-700 text-emerald-400"
              />
            </div>
          </div>

          {/* CREDENCIALES DE SEGURIDAD (CON HASH BCRYPT) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" /> Credenciales de Acceso
              </span>
              <button
                type="button"
                onClick={generarPasswordSegura}
                className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Generar aleatorios
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-[11px] text-slate-400">Contraseña Web</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Dejar vacía para 'Banco123*'"
                    className="font-mono text-xs pr-8 bg-slate-900 border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-slate-400">PIN Cajero (4 dígitos)</Label>
                <Input
                  type="password"
                  maxLength={4}
                  value={formData.pin_cajero}
                  onChange={(e) => setFormData({ ...formData, pin_cajero: e.target.value.replace(/\D/g, "") })}
                  placeholder="Por defecto: 1234"
                  className="mt-1 font-mono text-xs bg-slate-900 border-slate-700 text-center tracking-widest"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              🔒 Las contraseñas y PINs se encriptan de inmediato con <strong className="text-slate-300">Bcrypt (10 rondas de salt)</strong>. Nunca se guardan en texto plano.
            </p>
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Crear Cliente y Cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
