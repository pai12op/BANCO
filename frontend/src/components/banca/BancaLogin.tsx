import { useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BancaLoginProps {
  onLogin: (identificador: string, password: string) => Promise<void>;
  loading: boolean;
}

export function BancaLogin({ onLogin, loading }: BancaLoginProps) {
  const [identificador, setIdentificador] = useState("andres@cliente.com");
  const [password, setPassword] = useState("Banco123*");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(identificador, password);
  };

  return (
    <div className="min-h-[calc(100vh-53px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-inner">
              <Landmark className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold">Banca Virtual Personas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingrese sus credenciales de cliente para consultar saldos y transferir.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label className="text-xs">Correo Electrónico o Documento</Label>
              <Input
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="andres@cliente.com"
                required
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Contraseña Bancaria</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 font-mono text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 mt-2 h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Ingresar a Banca Virtual
            </Button>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-accent">Credenciales del Docente:</span>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent font-mono font-bold">
                  Rubrica
                </span>
              </div>
              <p className="text-muted-foreground">
                Usuario: <span className="font-mono text-foreground font-semibold">andres@cliente.com</span>
              </p>
              <p className="text-muted-foreground">
                Clave: <span className="font-mono text-foreground font-semibold">Banco123*</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setIdentificador("andres@cliente.com");
                  setPassword("Banco123*");
                }}
                className="mt-2.5 w-full rounded-lg bg-primary/20 py-2 text-center text-xs font-semibold text-accent hover:bg-primary/30 transition-colors"
              >
                ⚡ Autocompletar Cuenta Andrés Pai
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
