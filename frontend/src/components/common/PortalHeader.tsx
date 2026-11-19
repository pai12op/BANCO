import { Landmark, Wallet, CreditCard, ShieldCheck } from "lucide-react";

interface PortalHeaderProps {
  activeModule: "banca" | "cajero" | "admin";
  onSwitchModule: (mod: "banca" | "cajero" | "admin") => void;
}

export function PortalHeader({ activeModule, onSwitchModule }: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* LOGO INSTITUCIONAL */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-foreground">Banca Rota</span>
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                3NF · ACID
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden md:block">
              Simulador Bancario Integrado · Universidad de Manizales
            </p>
          </div>
        </div>

        {/* SELECTOR DE MÓDULOS / ROLES SEPARADOS */}
        <div className="flex items-center rounded-xl border border-border/80 bg-card/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onSwitchModule("banca")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeModule === "banca"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Banca Virtual</span>
            <span className="xs:hidden">Banca</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchModule("cajero")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeModule === "cajero"
                ? "bg-cyan-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Cajero ATM</span>
            <span className="xs:hidden">ATM</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchModule("admin")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeModule === "admin"
                ? "bg-purple-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Panel Admin</span>
            <span className="xs:hidden">Admin</span>
          </button>
        </div>

        {/* ESTADO DEL SISTEMA */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px]">Núcleo Seguro · Cifrado E2E</span>
        </div>
      </div>
    </header>
  );
}
