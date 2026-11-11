import { createFileRoute } from "@tanstack/react-router";
import { BancaVirtualView } from "@/components/banca/BancaVirtualView";
import { Landmark, CreditCard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banca Virtual — Banca Verde" },
      { name: "description", content: "Portal transaccional de clientes: saldos, tarjetas, transferencias con 4x1000 y extractos." },
      { property: "og:title", content: "Banca Virtual — Banca Verde" },
      { property: "og:description", content: "Portal transaccional de clientes" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      {/* CABECERA EXCLUSIVA DEL CLIENTE (CERO PANEL ADMIN AQUÍ) */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-foreground">Banca Verde</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Banca Personas
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Portal Transaccional de Clientes</p>
            </div>
          </div>

          {/* ACCESOS DE SERVICIO PARA EL CLIENTE (CERO PANEL ADMIN) */}
          <div className="flex items-center gap-3">
            <a
              href="/cajero"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Red de Cajeros ATM</span>
            </a>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-border/60 pl-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">Canal Seguro SSL</span>
            </div>
          </div>
        </div>
      </header>

      {/* PORTAL TRANSACCIONAL DEL CLIENTE */}
      <div className="flex-1">
        <BancaVirtualView />
      </div>

      {/* PIE DE PÁGINA INSTITUCIONAL DISCRETO */}
      <footer className="border-t border-border/40 bg-card/40 py-4 px-4 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>© 2026 Banco Digital Andino S.A. · Vigilado Superintendencia Financiera de Colombia</p>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/cajero" className="hover:text-cyan-400 hover:underline flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Cajero ATM Virtual
            </a>
            <span>·</span>
            <a href="/admin" className="hover:text-purple-400 hover:underline flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Acceso Empleados / Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
