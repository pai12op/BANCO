import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPanelView } from "@/components/admin/AdminPanelView";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Consola Administrativa — Banca Rota" },
      { name: "description", content: "Módulo administrativo interno, bóveda, ventanilla y gestión de clientes." },
      { property: "og:title", content: "Consola Administrativa — Banca Rota" },
      { property: "og:description", content: "Módulo administrativo interno del banco" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <AdminPanelView />
    </div>
  );
}
