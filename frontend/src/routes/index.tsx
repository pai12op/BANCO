import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BancaVirtualView } from "@/components/banca/BancaVirtualView";
import { CajeroAtmView } from "@/components/cajero/CajeroAtmView";
import { AdminPanelView } from "@/components/admin/AdminPanelView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador Bancario Web — 3NF" },
      { name: "description", content: "Simulador bancario integrado: Banca Virtual, Cajero ATM y Panel Administrativo sobre MySQL." },
      { property: "og:title", content: "Simulador Bancario Web" },
      { property: "og:description", content: "Simulador bancario integrado sobre MySQL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeModule, setActiveModule] = useState<"banca" | "cajero" | "admin">("banca");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* BARRA SUPERIOR DE SELECTOR RÁPIDO DE MÓDULOS (FIJA Y RESPONSIVE) */}
      <div className="sticky top-0 z-50 border-b border-border/80 bg-slate-950/90 backdrop-blur px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-slate-300">
              SIMULADOR BANCARIO
            </span>
            <span className="hidden sm:inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
              MySQL 3NF
            </span>
          </div>

          {/* BOTONES DE SWITCHER DE MÓDULOS */}
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/80 p-1">
            <button
              onClick={() => setActiveModule("banca")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeModule === "banca"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏦 Banca
            </button>
            <button
              onClick={() => setActiveModule("cajero")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeModule === "cajero"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏧 Cajero ATM
            </button>
            <button
              onClick={() => setActiveModule("admin")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeModule === "admin"
                  ? "bg-purple-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🛡️ Admin
            </button>
          </div>
        </div>
      </div>

      {/* RENDERIZADO DEL MÓDULO ACTIVO */}
      {activeModule === "banca" && <BancaVirtualView onSwitchModule={(mod) => setActiveModule(mod as any)} />}
      {activeModule === "cajero" && <CajeroAtmView onSwitchModule={(mod) => setActiveModule(mod as any)} />}
      {activeModule === "admin" && <AdminPanelView onSwitchModule={(mod) => setActiveModule(mod as any)} />}
    </div>
  );
}
