import { useState, useEffect } from "react";
import { Landmark, RefreshCw, UserPlus, LogIn, KeyRound, Shield, Eye, EyeOff, Sparkles, CheckCircle2, CreditCard, ShieldCheck, HelpCircle, Copy, Check } from "lucide-react";
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

  // Clave dinámica de 6 dígitos estilo Nequi
  const [claveDinamica, setClaveDinamica] = useState("892874");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showAyuda, setShowAyuda] = useState(false);

  // Formulario de Login
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  useEffect(() => {
    // Generar clave dinámica cada 30 segundos
    const timer = setInterval(() => {
      setClaveDinamica(Math.floor(100000 + Math.random() * 900000).toString());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyClave = () => {
    navigator.clipboard.writeText(claveDinamica);
    setCopiedKey(true);
    toast.success(`Clave dinámica copiada: ${claveDinamica}`);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Formulario de Registro Público
  const [regData, setRegData] = useState({
    tipo_documento_id: 1,
    numero_documento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    tipo_cuenta_id: 1,
    saldo_inicial: "",
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
      // Precargar documento (cédula) como usuario en el login
      setIdentificador(regData.numero_documento.trim());
      setPassword(regData.password);
    } catch (err) {
      toast.error("Error de conexión con el banco.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4">
      {/* ======================================================== */}
      {/* BARRA SUPERIOR ESTILO NEQUI (CLAVE DINÁMICA & AYUDA)     */}
      {/* ======================================================== */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between gap-2">
        {/* PÍLDORA CLAVE DINÁMICA CON CONTADOR */}
        <button
          type="button"
          onClick={handleCopyClave}
          className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-[#0c1830] px-3.5 py-1.5 text-xs text-white shadow-md shadow-blue-500/10 hover:border-cyan-400 active:scale-95 transition-all"
        >
          <div className="relative h-4 w-4 grid place-items-center">
            <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping" />
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[10px] text-slate-400 block leading-tight">Clave dinámica</span>
            <span className="font-bold text-cyan-300 tracking-wider text-xs">{claveDinamica}</span>
          </div>
          <Copy className="h-3.5 w-3.5 text-slate-400 ml-1" />
        </button>

        {/* BOTÓN AYUDA (?) */}
        <button
          type="button"
          onClick={() => setShowAyuda(true)}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-[#0c1424] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
        >
          <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
          <span>Ayuda</span>
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-sm rounded-3xl border border-[#1b2b4a] bg-[#091222] p-6 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative">
          {/* LOGOTIPO EXACTO A LA IMAGEN 2 (■ BANCA ROTA) */}
          <div className="text-center py-4">
            <h1 className="font-display text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span className="text-cyan-400 inline-block text-2xl font-black">■</span>
              <span>Banca Rota</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Tu banco digital seguro y en tiempo real
            </p>
          </div>

          {/* SELECTOR ENTRE INICIAR SESIÓN Y ABRIR CUENTA */}
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-slate-950/80 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setCuentaCreada(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                tab === "login"
                  ? "bg-[#0e76fd] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setTab("registro")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                tab === "registro"
                  ? "bg-[#0e76fd] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Abrir Cuenta
            </button>
          </div>

          {/* VISTA 1: INICIO DE SESIÓN ESTILO NEQUI */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              {cuentaCreada && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> ¡Cuenta creada exitosamente!
                  </div>
                  <p>
                    Usuario (Documento): <span className="font-mono font-bold text-white">{cuentaCreada.numero_documento}</span>
                  </p>
                  <p>
                    Tarjeta / Cuenta: <span className="font-mono font-bold text-white">{cuentaCreada.numero_cuenta}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ingresa con tu cédula y tu contraseña a continuación.
                  </p>
                </div>
              )}

              {/* INPUT ESTILO NEQUI: +57 | NÚMERO */}
              <div>
                <Label className="text-xs text-slate-300">Cédula o Número de Celular</Label>
                <div className="mt-1 flex items-center rounded-2xl border border-[#223558] bg-[#0c162b] px-3.5 py-3 text-xs text-white focus-within:border-cyan-400 transition-colors shadow-inner">
                  <span className="font-semibold text-slate-400 pr-2.5 border-r border-slate-700 select-none">
                    +57
                  </span>
                  <input
                    type="text"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="Número de documento o celular"
                    required
                    className="w-full pl-3 bg-transparent font-mono text-sm text-cyan-300 placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* INPUT CONTRASEÑA */}
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
                <div className="mt-1 flex items-center rounded-2xl border border-[#223558] bg-[#0c162b] px-3.5 py-3 text-xs text-white focus-within:border-cyan-400 transition-colors shadow-inner">
                  <input
                    type={showLoginPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-transparent font-mono text-sm placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* BOTÓN PRINCIPAL: "ENTRA" LIMPIO */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl h-12 text-sm font-bold bg-[#0e76fd] hover:bg-[#0b63d6] text-white shadow-lg shadow-blue-500/25 active:scale-98 transition-all"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Entra
                </Button>
              </div>

              {/* ENLACES RÁPIDOS */}
              <div className="flex items-center justify-center gap-3 pt-3 text-xs text-slate-400">
                <a href="/cajero" className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5 text-slate-400 hover:underline">
                  <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Cajero ATM</span>
                </a>
                <span className="text-slate-700">|</span>
                <a href="/admin" className="hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 text-slate-400 hover:underline">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                  <span>Consola Admin</span>
                </a>
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
                    placeholder="Ej: 1020304050"
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
                    placeholder="Nombres completos"
                    required
                    className="mt-1 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Apellidos *</Label>
                  <Input
                    value={regData.apellidos}
                    onChange={(e) => setRegData({ ...regData, apellidos: e.target.value })}
                    placeholder="Apellidos completos"
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
                    placeholder="nombre@ejemplo.com"
                    required
                    className="mt-1 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Teléfono Móvil</Label>
                  <Input
                    value={regData.telefono}
                    onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
                    placeholder="Ej: 3001234567"
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
                    placeholder="0"
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
                    placeholder="Mínimo 6 caracteres"
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
                    placeholder="Confirme su contraseña"
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
                  placeholder="••••"
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
