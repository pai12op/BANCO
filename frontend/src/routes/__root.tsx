import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Banca Virtual — Banca Rota" },
      { name: "description", content: "Portal transaccional de clientes: saldos, tarjetas, transferencias y extractos bancarios en tiempo real." },
      { name: "author", content: "Banca Rota S.A." },
      { property: "og:title", content: "Banca Virtual — Banca Rota" },
      { property: "og:description", content: "Portal transaccional de clientes en tiempo real" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700&family=Manrope:wght@400;500;600;700&display=swap" },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23091222'/%3E%3Cpath d='M32 10 L12 22 L52 22 Z' fill='%2300e5ff'/%3E%3Crect x='14' y='24' width='36' height='4' rx='1' fill='%230e76fd'/%3E%3Crect x='16' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='25' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='33' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='42' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='12' y='50' width='40' height='4' rx='1' fill='%230e76fd'/%3E%3C/svg%3E",
      },
      { rel: "alternate icon", href: "/favicon.ico?v=20261114" },
      { rel: "shortcut icon", href: "/favicon.ico?v=20261114" },
      { rel: "apple-touch-icon", href: "/favicon.svg?v=20261114" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Toaster } from "../components/ui/sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Reemplazo forzado en caliente del favicon en el navegador para eliminar caché persistente
    const svgBankIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23091222'/%3E%3Cpath d='M32 10 L12 22 L52 22 Z' fill='%2300e5ff'/%3E%3Crect x='14' y='24' width='36' height='4' rx='1' fill='%230e76fd'/%3E%3Crect x='16' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='25' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='33' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='42' y='30' width='6' height='18' rx='1' fill='%2300e5ff'/%3E%3Crect x='12' y='50' width='40' height='4' rx='1' fill='%230e76fd'/%3E%3C/svg%3E";
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach((el) => el.remove());

    const link = document.createElement("link");
    link.type = "image/svg+xml";
    link.rel = "icon";
    link.href = svgBankIcon;
    document.head.appendChild(link);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-right" richColors theme="dark" />
    </QueryClientProvider>
  );
}
