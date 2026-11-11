import { ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  autenticado: boolean;
  onLogout: () => void;
}

export function AdminHeader({ autenticado, onLogout }: AdminHeaderProps) {
  return (
    <header className="border-b bg-background/80 backdrop-blur px-4 py-4 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">
              Consola Administrativa
            </h1>
            <p className="text-xs text-muted-foreground">
              Bóveda, Ventanilla y Gestión de Clientes · Rol: Administrador
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors"
          >
            ← Ir a Portal Clientes
          </a>
          {autenticado && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-9"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir de Consola</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
