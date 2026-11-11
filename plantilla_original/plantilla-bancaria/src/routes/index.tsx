import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, PiggyBank, Settings,
  Bell, Search, ArrowUpRight, ArrowDownLeft, Send, Plus, Receipt, Landmark,
  MoreHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel — Banca Verde" },
      { name: "description", content: "Plantilla de panel bancario: saldos, tarjetas, transferencias y movimientos." },
      { property: "og:title", content: "Panel — Banca Verde" },
      { property: "og:description", content: "Plantilla de panel bancario: saldos, tarjetas y movimientos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const nav = [
  { icon: LayoutDashboard, label: "Inicio", active: true },
  { icon: Wallet, label: "Cuentas" },
  { icon: ArrowLeftRight, label: "Transferencias" },
  { icon: CreditCard, label: "Tarjetas" },
  { icon: PiggyBank, label: "Ahorros" },
  { icon: Landmark, label: "Préstamos" },
  { icon: Settings, label: "Ajustes" },
];

const mobileNav = [
  { icon: LayoutDashboard, label: "Inicio", active: true },
  { icon: Wallet, label: "Cuentas" },
  { icon: ArrowLeftRight, label: "Transferir" },
  { icon: CreditCard, label: "Tarjetas" },
  { icon: MoreHorizontal, label: "Más" },
];

const accounts = [
  { name: "Cuenta de Ahorros", num: "•••• 4821", bal: 12450300 },
  { name: "Cuenta Corriente", num: "•••• 1093", bal: 3820150 },
  { name: "CDT 180 días", num: "•••• 7710", bal: 25000000 },
];

const tx = [
  { who: "Nómina Empresa S.A.", cat: "Ingreso", date: "10 nov", amt: 4850000 },
  { who: "Supermercado Éxito", cat: "Mercado", date: "09 nov", amt: -312400 },
  { who: "Transferencia a Laura M.", cat: "Transferencia", date: "08 nov", amt: -500000 },
  { who: "Netflix", cat: "Suscripción", date: "07 nov", amt: -38900 },
  { who: "EPM Servicios", cat: "Servicios", date: "05 nov", amt: -184700 },
  { who: "Reembolso Amazon", cat: "Ingreso", date: "04 nov", amt: 129000 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const bars = [42, 65, 38, 80, 55, 72, 90, 48, 60, 76, 52, 68];
const months = "EFMAMJJASOND";

function Index() {
  const total = accounts.reduce((a, b) => a + b.bal, 0);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="mb-8 flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <span className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Banca Verde</span>
        </div>

        <nav className="space-y-1">
          {nav.map((n) => (
            <a key={n.label} href="#" aria-current={n.active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${n.active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <n.icon className="h-4 w-4 shrink-0" /> {n.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-sidebar-accent p-4 text-sm">
          <p className="font-semibold text-sidebar-accent-foreground">¿Necesitas ayuda?</p>
          <p className="mt-1 text-sidebar-foreground/80">Línea 24/7: 01 8000 123 456</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold leading-tight">Banca Verde</p>
                <p className="truncate text-xs text-muted-foreground">Buenas noches, Andrés</p>
              </div>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-sm text-muted-foreground">Buenas noches,</p>
              <h1 className="truncate font-display text-2xl font-bold">Andrés Paiwa</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button aria-label="Buscar" className="grid h-9 w-9 place-items-center rounded-lg border bg-card lg:hidden">
                <Search className="h-4 w-4" />
              </button>
              <button aria-label="Notificaciones" className="relative grid h-9 w-9 place-items-center rounded-lg border bg-card">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="mb-4 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2.5 lg:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input placeholder="Buscar movimientos" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>

          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <section className="relative flex min-w-0 items-center overflow-hidden rounded-lg bg-gradient-card p-5 text-primary-foreground ring-1 ring-primary/25 sm:p-6">
            <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />
            <div className="relative w-full">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-75">Saldo total disponible</p>
                  <p className="mt-2 truncate font-display text-3xl font-bold sm:text-4xl">{fmt(total)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  +8,2%
                </span>
              </div>
              <p className="mt-2 text-xs opacity-70">3 cuentas activas · actualizado hoy, 7:42 p. m.</p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[{ i: Send, l: "Transferir" }, { i: Receipt, l: "Pagar" }, { i: Plus, l: "Recargar" }].map((a) => (
                  <Button key={a.l} variant="ghost"
                    className="h-auto min-w-0 flex-col gap-1.5 rounded-lg bg-primary-foreground/10 px-2 py-3 text-xs font-semibold hover:bg-primary-foreground/20 hover:text-primary-foreground">
                    <a.i className="h-4 w-4 shrink-0" /> {a.l}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Tarjeta de crédito" className="mx-auto flex aspect-[1.586/1] w-full max-w-[380px] min-w-0 flex-col justify-between rounded-lg border border-payment-data/30 bg-payment-card p-5 text-payment-data">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="text-sm font-semibold">Tarjeta de crédito</p>
                <CreditCard aria-hidden className="h-6 w-6 shrink-0" />
              </div>
              <p className="my-4 whitespace-nowrap font-mono text-lg">5412 •••• •••• 9087</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-xs">Titular</p>
                  <p className="truncate text-sm font-semibold">A. PAIWA</p>
                </div>
                <div className="text-right text-xs"><p>Vence</p><p className="mt-0.5 font-semibold">08/29</p></div>
              </div>
              <div className="mt-3">
                <div className="flex flex-wrap justify-between gap-1 text-[11px]"><span>Cupo usado {fmt(3800000)}</span><span>38% de {fmt(10000000)}</span></div>
                <div className="mt-2 h-1 rounded-full bg-payment-data/15"><div className="h-1 w-[38%] rounded-full bg-payment-data" /></div>
              </div>
          </section>
          </div>

          <section className="mt-6">
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate font-display text-lg font-bold">Tus cuentas</h2>
              <a href="#" className="shrink-0 text-sm font-semibold text-accent">Ver todas</a>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
              {accounts.map((a) => (
                <article key={a.num}
                  className="w-[80%] max-w-[360px] shrink-0 snap-start rounded-lg border bg-card p-4 md:w-auto md:min-w-0 md:max-w-none md:shrink">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.num}</span>
                  </div>
                  <p className="mt-3 truncate font-display text-2xl font-bold">{fmt(a.bal)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Disponible hoy</p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <section className="rounded-2xl border bg-card p-4 lg:col-span-3 lg:p-6">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate font-display text-lg font-bold">Últimos movimientos</h2>
                <a href="#" className="shrink-0 text-sm font-semibold text-accent">Ver todos</a>
              </div>
              <ul className="divide-y divide-border">
                {tx.map((t) => (
                  <li key={t.who} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${t.amt > 0 ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"}`}>
                      {t.amt > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.who}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.cat} · {t.date}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${t.amt > 0 ? "text-success" : ""}`}>
                      {t.amt > 0 ? "+" : ""}{fmt(t.amt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border bg-card p-4 lg:col-span-2 lg:p-6">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold">Gastos 2026</h2>
                  <p className="truncate text-xs text-muted-foreground">Por mes</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  Noviembre
                </span>
              </div>
              <div className="mt-6 flex h-40 items-stretch gap-1.5 sm:gap-2">
                {bars.map((b, i) => (
                  <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <div className={`w-full rounded-t-md ${i === 10 ? "bg-accent" : "bg-primary/70"}`} style={{ height: `${b}%` }} />
                    <span className={`text-[10px] ${i === 10 ? "font-bold text-accent" : "text-muted-foreground"}`}>{months[i]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      <nav aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {mobileNav.map((n) => (
            <li key={n.label}>
              <a href="#" aria-current={n.active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors ${n.active ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                <n.icon className={`h-5 w-5 shrink-0 ${n.active ? "text-accent" : ""}`} />
                <span className="truncate">{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
