import { useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminLoginProps {
  onLogin: (correo: string, pass: string) => Promise<void>;
  loading: boolean;
}

export function AdminLogin({ onLogin, loading }: AdminLoginProps) {
  const [adminCorreo, setAdminCorreo] = useState("admin@banco.com");
  const [adminPassword, setAdminPassword] = useState("Banco123*");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(adminCorreo, adminPassword);
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

      <div className="relative">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold">Acceso Administrativo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Módulo reservado para gerencia y cajeros de ventanilla
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label className="text-xs">Correo Electrónico</Label>
            <Input
              type="email"
              value={adminCorreo}
              onChange={(e) => setAdminCorreo(e.target.value)}
              required
              className="mt-1 font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Contraseña de Administrador</Label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              className="mt-1 font-mono text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 mt-2 h-11 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
          >
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            Ingresar a la Consola
          </Button>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs">
            <p className="font-semibold text-purple-300">Credenciales del Proyecto (Rubrica):</p>
            <p className="mt-1 text-muted-foreground">
              Usuario: <span className="font-mono text-foreground font-semibold">admin@banco.com</span>
            </p>
            <p className="text-muted-foreground">
              Clave: <span className="font-mono text-foreground font-semibold">Banco123*</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setAdminCorreo("admin@banco.com");
                setAdminPassword("Banco123*");
              }}
              className="mt-2 w-full rounded-lg bg-purple-500/20 py-1.5 text-center text-[11px] font-semibold text-purple-300 hover:bg-purple-500/30"
            >
              ⚡ Autocompletar Cuenta Administrador
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
