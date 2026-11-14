import { createFileRoute } from "@tanstack/react-router";
import { BancaVirtualView } from "@/components/banca/BancaVirtualView";
import { Landmark, CreditCard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banca Virtual — Banca Rota" },
      { name: "description", content: "Portal transaccional de clientes: saldos, tarjetas, transferencias con 4x1000 y extractos." },
      { property: "og:title", content: "Banca Virtual — Banca Rota" },
      { property: "og:description", content: "Portal transaccional de clientes" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col w-full max-w-full overflow-x-hidden">
      {/* PORTAL TRANSACCIONAL DEL CLIENTE (BANCA VERDE) */}
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        <BancaVirtualView />
      </div>

      {/* PIE DE PÁGINA INSTITUCIONAL DISCRETO */}
      <footer className="border-t border-border/40 bg-card/40 py-3 px-4 text-xs text-muted-foreground lg:pl-64 w-full">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>© 2026 Banca Rota S.A. · Vigilado Superintendencia Financiera</p>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/cajero" className="hover:text-cyan-400 hover:underline flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Red Cajeros ATM
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
