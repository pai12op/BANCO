import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Phone, User, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Usuario } from "../types";

interface AjustesViewProps {
  usuario: Usuario | null;
  onUpdateTelefono: (nuevoTel: string) => Promise<boolean>;
  onCambiarPassword: (passAct: string, passNew: string) => Promise<boolean>;
}

export function AjustesView({ usuario, onUpdateTelefono, onCambiarPassword }: AjustesViewProps) {
  const [telefono, setTelefono] = useState(usuario?.telefono || "3001234567");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [loadingTel, setLoadingTel] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  const handleGuardarTelefono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim()) {
      toast.error("Ingrese un número de teléfono válido.");
      return;
    }
    setLoadingTel(true);
    const ok = await onUpdateTelefono(telefono.trim());
    setLoadingTel(false);
    if (ok) {
      toast.success("Teléfono actualizado en la base de datos.");
    }
  };

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passNueva.length < 6) {
      toast.error("La nueva contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (passNueva !== passConfirm) {
      toast.error("La confirmación de la nueva contraseña no coincide.");
      return;
    }

    setLoadingPass(true);
    const ok = await onCambiarPassword(passActual, passNueva);
    setLoadingPass(false);
    if (ok) {
      setPassActual("");
      setPassNueva("");
      setPassConfirm("");
      toast.success("Contraseña actualizada exitosamente con cifrado bcrypt.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-border/60 pb-4">
        <h2 className="font-display text-2xl font-bold">Perfil y Ajustes de Seguridad</h2>
        <p className="text-xs text-muted-foreground">
          Administra tus datos de contacto personales y actualiza tus credenciales de acceso seguro.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* INFORMACIÓN DEL TITULAR Y TELÉFONO */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-bold">Información Personal</h3>
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Titular de la Cuenta:</span>
              <span className="font-bold text-foreground">
                {usuario?.nombres} {usuario?.apellidos}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Tipo y No. Documento:</span>
              <span className="font-mono text-foreground font-semibold">
                {usuario ? `${usuario?.tipo_documento || "CC"} ${usuario?.numero_documento}` : "Sin información"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correo Registrado:</span>
              <span className="font-mono text-foreground font-semibold">
                {usuario?.correo || "correo@ejemplo.com"}
              </span>
            </div>
          </div>

          {/* EDITAR TELÉFONO */}
          <form onSubmit={handleGuardarTelefono} className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Teléfono Móvil de Contacto (SMS)</Label>
            <div className="flex gap-2">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3001234567"
                required
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                disabled={loadingTel}
                className="h-10 text-xs px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loadingTel && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />}
                Actualizar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Se enviarán códigos de autenticación OTP a este número para autorizar transferencias.
            </p>
          </form>
        </div>

        {/* CAMBIO DE CONTRASEÑA BANCARIA */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-bold">Cambio de Contraseña</h3>
          </div>

          <form onSubmit={handleGuardarPassword} className="space-y-4">
            <div>
              <Label className="text-xs">Contraseña Actual</Label>
              <Input
                type="password"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Tu contraseña actual"
                required
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Nueva Contraseña</Label>
              <Input
                type="password"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Confirmar Nueva Contraseña</Label>
              <Input
                type="password"
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                className="mt-1 font-mono text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loadingPass || !passActual || !passNueva}
              className="w-full h-11 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loadingPass && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
              Guardar Nueva Contraseña
            </Button>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-accent">Norma de Ciberseguridad:</p>
              <p>Tu clave se almacena con función hash unidireccional bcrypt con sal de 10 rondas.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
