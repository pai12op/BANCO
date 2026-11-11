import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PortalHeader } from "@/components/common/PortalHeader";
import { BancaVirtualView } from "@/components/banca/BancaVirtualView";
import { CajeroAtmView } from "@/components/cajero/CajeroAtmView";
import { AdminPanelView } from "@/components/admin/AdminPanelView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banca Verde — Simulador Bancario 3NF" },
      { name: "description", content: "Simulador bancario web en 3NF: Banca Virtual, Cajero ATM y Consola Administrativa." },
      { property: "og:title", content: "Banca Verde — Simulador Bancario 3NF" },
      { property: "og:description", content: "Simulador bancario web en 3NF" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeModule, setActiveModule] = useState<"banca" | "cajero" | "admin">("banca");

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <PortalHeader
        activeModule={activeModule}
        onSwitchModule={setActiveModule}
      />

      <div className="flex-1">
        {activeModule === "banca" && (
          <BancaVirtualView
            activeModule={activeModule}
            onSwitchModule={(mod) => setActiveModule(mod as any)}
          />
        )}
        {activeModule === "cajero" && (
          <CajeroAtmView
            activeModule={activeModule}
            onSwitchModule={(mod) => setActiveModule(mod as any)}
          />
        )}
        {activeModule === "admin" && (
          <AdminPanelView
            activeModule={activeModule}
            onSwitchModule={(mod) => setActiveModule(mod as any)}
          />
        )}
      </div>
    </div>
  );
}
