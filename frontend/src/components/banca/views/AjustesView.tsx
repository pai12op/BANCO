import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { isStrongPassword } from "@/lib/secureFetch";
import { Usuario } from "../types";

interface AjustesViewProps {
  usuario: Usuario | null;
  onUpdateTelefono: (nuevoTel: string) => Promise<boolean>;
  onCambiarPassword: (
    passAct: string,
    passNew: string,
    passConfirm: string,
    pinCajero: string
  ) => Promise<boolean>;
}

export function AjustesView({
  usuario,
  onUpdateTelefono,
  onCambiarPassword,
}: AjustesViewProps) {
  const [telefono, setTelefono] = useState(usuario?.telefono || "");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [pinCajero, setPinCajero] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
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
      toast.success("Teléfono actualizado con éxito", {
        description: `Tu número de contacto ahora es ${telefono.trim()}.`,
      });
    }
  };

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMsg(null);

    if (!passActual) {
      toast.error("Debes ingresar tu contraseña actual.");
      return;
    }
    if (!isStrongPassword(passNueva)) {
      toast.error(
        "La nueva contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y al menos un número."
      );
      return;
    }
    if (passNueva === passActual) {
      toast.error("La nueva contraseña debe ser diferente a la actual.");
      return;
    }
    if (passNueva !== passConfirm) {
      toast.error("La confirmación de la nueva contraseña no coincide.");
      return;
    }
    const pinClean = pinCajero.trim();
    if (!/^\d{4}$/.test(pinClean)) {
      toast.error("Para autenticar el cambio debes ingresar tu PIN de 4 dígitos.");
      return;
    }

    setLoadingPass(true);
    const ok = await onCambiarPassword(passActual, passNueva, passConfirm, pinClean);
    setLoadingPass(false);
    if (ok) {
      setPassActual("");
      setPassNueva("");
      setPassConfirm("");
      setPinCajero("");
      setPassSuccessMsg(
        "Contraseña actualizada con verificación de clave actual + PIN de 4 dígitos y sesión rotada."
      );
      toast.success("¡Contraseña actualizada con éxito!", {
        description: "Credenciales cifradas y sesión bancaria renovada.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-border/60 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Perfil y Ajustes de Seguridad</h2>
          <p className="text-xs text-muted-foreground">
            Administra tus datos de contacto y realiza cambios de contraseña con doble verificación (clave actual + PIN ATM).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Autenticación Reforzada E2E
        </span>
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
              Se enviarán notificaciones de seguridad a este número para operaciones relevantes.
            </p>
          </form>
        </div>

        {/* CAMBIO DE CONTRASEÑA BANCARIA CON VERIFICACIÓN PIN + CLAVE ACTUAL */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold">Cambio de Contraseña Autenticado</h3>
            </div>
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>

          {passSuccessMsg && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{passSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleGuardarPassword} className="space-y-4">
            <div>
              <Label className="text-xs">1. Contraseña Actual</Label>
              <div className="relative mt-1">
                <Input
                  type={showActual ? "text" : "password"}
                  value={passActual}
                  onChange={(e) => {
                    setPassActual(e.target.value);
                    setPassSuccessMsg(null);
                  }}
                  placeholder="Tu contraseña actual"
                  required
                  className="font-mono text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowActual(!showActual)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                2. PIN de Seguridad de la Cuenta (4 dígitos)
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  value={pinCajero}
                  onChange={(e) => setPinCajero(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  required
                  className="font-mono text-sm tracking-[0.4em] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">3. Nueva Contraseña Segura</Label>
              <div className="relative mt-1">
                <Input
                  type={showNueva ? "text" : "password"}
                  value={passNueva}
                  onChange={(e) => setPassNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres (Mayús, minús, número)"
                  required
                  className="font-mono text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNueva(!showNueva)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">4. Confirmar Nueva Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  required
                  className="font-mono text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loadingPass || !passActual || !passNueva || !passConfirm || pinCajero.length !== 4}
              className="w-full h-11 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loadingPass && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
              Autorizar y Cambiar Contraseña
            </Button>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-accent">Doble Verificación de Seguridad:</p>
              <p>
                El cambio viaja cifrado con RSA-OAEP + AES-GCM, valida tu clave actual y PIN bancario, y rota tu identificador de sesión.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
