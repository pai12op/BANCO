import { useState } from "react";
import { Landmark, RefreshCw, UserPlus, LogIn, KeyRound, Shield, Eye, EyeOff, Sparkles, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BancaLoginProps {
  onLogin: (identificador: string, password: string) => Promise<void>;
  loading: boolean;
}

export function BancaLogin({ onLogin, loading }: BancaLoginProps) {
  const [tab, setTab] = useState<"login" | "registro">("login");

  // Formulario de Login (arranca limpio sin texto plano quemado)
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Formulario de Registro Público
  const [regData, setRegData] = useState({
    tipo_documento_id: 1,
    numero_documento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    tipo_cuenta_id: 1,
    saldo_inicial: "1000000",
    password: "",
    password_confirm: "",
    pin_cajero: "",
  });
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [cuentaCreada, setCuentaCreada] = useState<any>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !password) {
      toast.error("Ingrese su documento o correo y contraseña.");
      return;
    }
    onLogin(identificador.trim(), password);
  };

  const handleRegistroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regData.numero_documento.trim() || !regData.nombres.trim() || !regData.apellidos.trim() || !regData.correo.trim()) {
      toast.error("Por favor complete todos los datos requeridos.");
      return;
    }

    if (regData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (regData.password !== regData.password_confirm) {
      toast.error("Las contraseñas ingresadas no coinciden.");
      return;
    }

    const pin = regData.pin_cajero.trim();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("El PIN del cajero debe ser de 4 dígitos numéricos.");
      return;
    }

    try {
      setRegLoading(true);
      const res = await fetch("/api/auth/registro-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_documento_id: regData.tipo_documento_id,
          numero_documento: regData.numero_documento.trim(),
          nombres: regData.nombres.trim(),
          apellidos: regData.apellidos.trim(),
          correo: regData.correo.trim(),
          telefono: regData.telefono.trim(),
          tipo_cuenta_id: regData.tipo_cuenta_id,
          saldo_inicial: parseFloat(regData.saldo_inicial) || 0,
          password: regData.password,
          pin_cajero: pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo crear la cuenta bancaria.");
        return;
      }

      toast.success(data.mensaje);
      setCuentaCreada(data.cuenta);
      // Precargar correo en el login
      setIdentificador(regData.correo.trim());
      setPassword(regData.password);
    } catch (err) {
      toast.error("Error de conexión con el banco.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4">
      {/* BARRA SUPERIOR DE SELECTOR DE CANALES PÚBLICOS */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 text-xs">
        <span className="font-semibold text-primary px-3 flex items-center gap-1.5">
          <Landmark className="h-3.5 w-3.5" /> Banca Personas
        </span>
        <div className="flex items-center gap-1">
          <a
            href="/cajero"
            className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors flex items-center gap-1"
          >
            <CreditCard className="h-3 w-3" /> Terminal Cajero ATM
          </a>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-[#0e1626] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-13 w-13 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-inner">
              <Landmark className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold">Banco Digital Andino</h2>
            <p className="mt-1 text-xs text-slate-400">
              Sistema bancario centralizado con transacciones seguras en tiempo real
            </p>
          </div>

          {/* SELECTOR ENTRE INICIAR SESIÓN Y ABRIR CUENTA */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setCuentaCreada(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                tab === "login"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setTab("registro")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                tab === "registro"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Abrir Cuenta
            </button>
          </div>

          {/* VISTA 1: INICIO DE SESIÓN */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              {cuentaCreada && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> ¡Cuenta creada exitosamente!
                  </div>
                  <p>
                    Número de Cuenta: <span className="font-mono font-bold text-white">{cuentaCreada.numero_cuenta}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ingresa tus credenciales a continuación para acceder a tu Banca Virtual.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-300">Correo Electrónico o No. Documento</Label>
                <Input
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="andres@cliente.com o C.C."
                  required
                  className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Contraseña Bancaria</Label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showLoginPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showLoginPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <Input
                  type={showLoginPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 mt-2 h-10 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Ingresar a Banca Virtual
              </Button>

              {/* ACCESO RÁPIDO PARA SUSTENTACIÓN (BOTÓN OPCIONAL) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300">Sustentación Docente:</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary font-mono font-bold">
                    Caso Pág. 9
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentificador("andres@cliente.com");
                    setPassword("Banco123*");
                  }}
                  className="w-full rounded-lg bg-slate-900 py-1.5 text-center text-[11px] font-semibold text-primary hover:bg-slate-800 border border-slate-700/80 transition-colors"
                >
                  ⚡ Cargar Cliente Andrés Pai ($1.000.000)
                </button>
              </div>
            </form>
          )}

          {/* VISTA 2: REGISTRO PÚBLICO CON TODOS LOS DATOS */}
          {tab === "registro" && (
            <form onSubmit={handleRegistroSubmit} className="mt-4 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-300">Tipo Doc</Label>
                  <select
                    value={regData.tipo_documento_id}
                    onChange={(e) => setRegData({ ...regData, tipo_documento_id: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none"
                  >
                    <option value={1}>CC</option>
                    <option value={2}>CE</option>
                    <option value={3}>PAS</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px] text-slate-300">Número de Documento *</Label>
                  <Input
                    value={regData.numero_documento}
                    onChange={(e) => setRegData({ ...regData, numero_documento: e.target.value })}
                    placeholder="1001998877"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-300">Nombres *</Label>
                  <Input
                    value={regData.nombres}
                    onChange={(e) => setRegData({ ...regData, nombres: e.target.value })}
                    placeholder="Andrés"
                    required
                    className="mt-1 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Apellidos *</Label>
                  <Input
                    value={regData.apellidos}
                    onChange={(e) => setRegData({ ...regData, apellidos: e.target.value })}
                    placeholder="Pai"
                    required
                    className="mt-1 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-300">Correo Electrónico *</Label>
                  <Input
                    type="email"
                    value={regData.correo}
                    onChange={(e) => setRegData({ ...regData, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Teléfono Móvil</Label>
                  <Input
                    value={regData.telefono}
                    onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
                    placeholder="3234594161"
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-300">Tipo de Cuenta</Label>
                  <select
                    value={regData.tipo_cuenta_id}
                    onChange={(e) => setRegData({ ...regData, tipo_cuenta_id: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none"
                  >
                    <option value={1}>Ahorros (4001...)</option>
                    <option value={2}>Corriente (5001...)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Depósito Inicial (COP)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={regData.saldo_inicial}
                    onChange={(e) => setRegData({ ...regData, saldo_inicial: e.target.value })}
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* CONTRASEÑA Y CONFIRMACIÓN */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <Label className="text-[11px] text-slate-300">Contraseña Web *</Label>
                  <Input
                    type={showRegPass ? "text" : "password"}
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Mínimo 6 chars"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Confirmar Clave *</Label>
                  <Input
                    type={showRegPass ? "text" : "password"}
                    value={regData.password_confirm}
                    onChange={(e) => setRegData({ ...regData, password_confirm: e.target.value })}
                    placeholder="Repite clave"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-slate-300">PIN de 4 Dígitos para Cajero ATM *</Label>
                <Input
                  type="password"
                  maxLength={4}
                  value={regData.pin_cajero}
                  onChange={(e) => setRegData({ ...regData, pin_cajero: e.target.value.replace(/\D/g, "") })}
                  placeholder="Ej: 9876"
                  required
                  className="mt-1 font-mono text-xs bg-slate-900 border-slate-700 text-center tracking-widest"
                />
              </div>

              <Button
                type="submit"
                disabled={regLoading}
                className="w-full gap-2 mt-2 h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              >
                {regLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Crear Mi Cuenta Bancaria
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
