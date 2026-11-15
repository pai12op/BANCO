import { useState, useEffect } from "react";
import {
  ShieldCheck, RefreshCw, Landmark, CreditCard, Lock,
  Eye, EyeOff, KeyRound, Smartphone, Copy, Check, ArrowLeft, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onLogin?: (correo: string, pass: string) => Promise<void>;
  loading?: boolean;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [step, setStep] = useState<"credenciales" | "2fa">("credenciales");
  const [adminCorreo, setAdminCorreo] = useState("admin@banco.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados del Segundo Factor (2FA)
  const [codigo2FA, setCodigo2FA] = useState("");
  const [codigoDemo, setCodigoDemo] = useState("");
  const [correoEnmascarado, setCorreoEnmascarado] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos de expiración

  // Contador regresivo de vigencia del código 2FA
  useEffect(() => {
    if (step !== "2fa" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Paso 1: Validación de Credenciales Básicas
  const handleCredencialesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCorreo.trim() || !adminPassword) {
      toast.error("Ingrese correo y contraseña administrativa.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: adminCorreo.trim(), password: adminPassword }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales administrativas inválidas.");
        return;
      }

      if (data.requires2FA) {
        setCodigoDemo(data.codigo_demo || "");
        setCorreoEnmascarado(data.correo_enmascarado || adminCorreo);
        setTimeLeft(300);
        setStep("2fa");
        toast.info("Credenciales verificadas. Ingrese el código 2FA de seguridad.");
      } else {
        // En caso de que se loguee directamente sin reto
        toast.success("Bienvenido Administrador.");
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      toast.error("Error de conexión con el servidor bancario.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Validación del Segundo Factor de Autenticación (2FA)
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codigo2FA.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      toast.error("El código 2FA debe tener exactamente 6 dígitos numéricos.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-2fa-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cleanCode }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Código 2FA incorrecto o no autorizado.");
        return;
      }

      toast.success("Autenticación en dos pasos exitosa. Acceso concedido.");
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      toast.error("Error de comunicación al verificar 2FA.");
    } finally {
      setLoading(false);
    }
  };

  // Reenviar o generar nuevo token 2FA
  const handleReenviar2FA = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/resend-2fa-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo generar nuevo código.");
        return;
      }

      setCodigoDemo(data.codigo_demo || "");
      setTimeLeft(300);
      setCodigo2FA("");
      toast.success("Nuevo código 2FA emitido a su terminal.");
    } catch (err) {
      toast.error("Error al reenviar código 2FA.");
    } finally {
      setLoading(false);
    }
  };

  // Copiar o autocompletar el token para agilizar la sustentación docente
  const handleAutocompletar = () => {
    if (codigoDemo) {
      setCodigo2FA(codigoDemo);
      navigator.clipboard.writeText(codigoDemo);
      setCopiedToken(true);
      toast.success(`Código 2FA ${codigoDemo} autocompletado`);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4">
      {/* BARRA SUPERIOR DE SELECTOR DE MÓDULOS */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 text-xs">
        <span className="font-semibold text-purple-400 px-3 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Consola Administrativa
        </span>
        <div className="flex items-center gap-1">
          <a
            href="/"
            className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors flex items-center gap-1"
          >
            <Landmark className="h-3 w-3" /> Banca Clientes
          </a>
          <a
            href="/cajero"
            className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors flex items-center gap-1"
          >
            <CreditCard className="h-3 w-3" /> Cajero ATM
          </a>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-[#0e1626] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative">
          {/* ======================================================== */}
          {/* VISTA 1: CREDENCIALES (CORREO Y CONTRASEÑA)              */}
          {/* ======================================================== */}
          {step === "credenciales" && (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-inner">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">Consola Backoffice</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Control gerencial, auditoría y monitoreo transaccional
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/30 px-3 py-1 text-[11px] font-medium text-purple-300">
                  <Lock className="h-3 w-3" /> Requiere 2FA (Segundo Factor Activo)
                </div>
              </div>

              <form onSubmit={handleCredencialesSubmit} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs text-slate-300">Correo Electrónico Institucional</Label>
                  <Input
                    type="email"
                    value={adminCorreo}
                    onChange={(e) => setAdminCorreo(e.target.value)}
                    placeholder="admin@banco.com"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-300">Contraseña de Administrador</Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 mt-2 h-10 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  Validar Credenciales y Solicitar 2FA
                </Button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISTA 2: SEGUNDO FACTOR DE AUTENTICACIÓN (2FA)           */}
          {/* ======================================================== */}
          {step === "2fa" && (
            <div className="animate-in fade-in duration-200">
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                  <Smartphone className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                  Verificación de Dos Pasos
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Autenticación de Segundo Factor (2FA) requerida para {correoEnmascarado}
                </p>
              </div>

              {/* TOKEN INTERACTIVO PARA SUSTENTACIÓN ACADÉMICA */}
              <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-[#071324] p-3.5 text-xs text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <KeyRound className="h-3.5 w-3.5" /> Token de Seguridad OTP
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Expira en: <span className="font-bold text-cyan-300">{formatTimer(timeLeft)}</span>
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-950/70 border border-cyan-500/20 px-3 py-2">
                  <div className="font-mono text-xl font-black tracking-widest text-cyan-300 select-all">
                    {codigoDemo || "------"}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutocompletar}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition-colors"
                  >
                    {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedToken ? "Copiado" : "Autocompletar"}</span>
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 leading-tight">
                  Simula la recepción del token criptográfico mediante App Autenticadora o canal seguro corporativo.
                </p>
              </div>

              <form onSubmit={handle2FASubmit} className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-300 text-center block">
                    Ingrese el Código de 6 Dígitos
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={codigo2FA}
                    onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="mt-1 font-mono text-center tracking-[0.6em] text-2xl font-bold bg-slate-950/90 border-cyan-500/40 text-cyan-300 focus:border-cyan-400 h-12"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || codigo2FA.length !== 6}
                  className="w-full gap-2 h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verificar Código y Autorizar Ingreso
                </Button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credenciales");
                      setCodigo2FA("");
                    }}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Cambiar cuenta</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReenviar2FA}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reenviar nuevo código</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
