import { useState } from "react";
import { ShieldCheck, RefreshCw, Landmark, CreditCard, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AdminLoginProps {
  onLogin: (correo: string, pass: string) => Promise<void>;
  loading: boolean;
}

export function AdminLogin({ onLogin, loading }: AdminLoginProps) {
  const [adminCorreo, setAdminCorreo] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCorreo.trim() || !adminPassword) {
      toast.error("Ingrese correo y contraseña administrativa.");
      return;
    }
    onLogin(adminCorreo.trim(), adminPassword);
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
            className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-primary hover:bg-slate-800/80 transition-colors flex items-center gap-1"
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
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-13 w-13 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold">Consola Backoffice</h2>
            <p className="mt-1 text-xs text-slate-400">
              Módulo interno para gerencia, ventanilla de depósitos y control de cuentas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Ingresar a la Consola
            </Button>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-slate-400">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-purple-300">Sustentación Docente:</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300 font-mono font-bold">
                  Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminCorreo("admin@banco.com");
                  setAdminPassword("Banco123*");
                }}
                className="w-full rounded-lg bg-purple-500/20 py-1.5 text-center text-[11px] font-semibold text-purple-200 hover:bg-purple-500/30 transition-colors"
              >
                ⚡ Cargar Credenciales Admin (Carlos Mendoza)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
