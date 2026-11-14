import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PiggyBank, Plus, ArrowUpRight, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function AhorrosView() {
  const [bolsillos, setBolsillos] = useState<
    { id: number; nombre: string; meta: number; actual: number; emoji: string }[]
  >([]);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaMeta, setNuevaMeta] = useState("");

  const handleCrearBolsillo = (e: React.FormEvent) => {
    e.preventDefault();
    const metaNum = parseFloat(nuevaMeta);
    if (!nuevoNombre.trim() || isNaN(metaNum) || metaNum <= 0) {
      toast.error("Ingrese un nombre y una meta válida.");
      return;
    }

    const nuevo = {
      id: Date.now(),
      nombre: nuevoNombre.trim(),
      meta: metaNum,
      actual: 0,
      emoji: "🎯",
    };

    setBolsillos([...bolsillos, nuevo]);
    setNuevoNombre("");
    setNuevaMeta("");
    setModalNuevo(false);
    toast.success(`Bolsillo "${nuevo.nombre}" creado exitosamente.`);
  };

  const handleAbonar = (id: number) => {
    setBolsillos(
      bolsillos.map((b) => (b.id === id ? { ...b, actual: Math.min(b.meta, b.actual + 100000) } : b))
    );
    toast.success("Has abonado $100.000 COP a tu meta de ahorro.");
  };

  const totalAhorrado = bolsillos.reduce((acc, b) => acc + b.actual, 0);

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Mis Bolsillos y Ahorros</h2>
          <p className="text-xs text-muted-foreground">
            Ahorra automáticamente para tus metas sin comisiones y con rendimientos diarios.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalNuevo(true)}
          className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Crear Nuevo Bolsillo
        </Button>
      </div>

      {/* HERO CDT DIGITAL */}
      <div className="rounded-2xl border border-accent/40 bg-gradient-card p-6 shadow-xl relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent border border-accent/30">
                INVERSIÓN DISPONIBLE
              </span>
              <span className="text-xs text-muted-foreground font-mono">Plazo Fijo a 180 Días</span>
            </div>
            <p className="font-display text-2xl font-bold text-white mt-2">CDT Digital con Tasa 11.50% E.A.</p>
            <p className="text-xs text-slate-300 mt-1">
              Haz crecer tu dinero de forma 100% segura. Aperturas en ventanilla o desde tu cuenta de ahorros.
            </p>
          </div>

          <div className="rounded-xl bg-card/60 border border-border/60 p-4 text-xs font-mono space-y-1">
            <p className="text-muted-foreground">Monto Mínimo: <span className="text-foreground font-semibold">$ 500.000 COP</span></p>
            <p className="text-muted-foreground">Plazos: <span className="text-cyan-300 font-semibold">90, 180 o 360 días</span></p>
            <p className="text-muted-foreground">Seguro: <span className="text-emerald-400 font-bold">Protegido Fogafín</span></p>
          </div>
        </div>
      </div>

      {/* METAS Y BOLSILLOS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Metas de Ahorro Programado</h3>
          <span className="text-xs text-muted-foreground font-mono">
            Total en bolsillos: <strong className="text-emerald-400">{fmt(totalAhorrado)}</strong>
          </span>
        </div>

        {bolsillos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/30">
            <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-200">Aún no tienes bolsillos creados</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Crea tu primer bolsillo para apartar plata de tu cuenta y ahorrar para tus viajes, tecnología o emergencias.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bolsillos.map((b) => {
              const porcentaje = Math.min(100, Math.round((b.actual / b.meta) * 100));
              return (
                <div key={b.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{b.emoji}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{b.nombre}</h4>
                        <p className="text-[11px] text-muted-foreground">Meta: {fmt(b.meta)}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-300">{porcentaje}%</span>
                  </div>

                  {/* BARRA DE PROGRESO */}
                  <div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-mono">
                      <span>Ahorrado: {fmt(b.actual)}</span>
                      <span>Falta: {fmt(Math.max(0, b.meta - b.actual))}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbonar(b.id)}
                    className="w-full h-8 text-xs gap-1 border-primary/40 text-primary-foreground hover:bg-primary/20"
                  >
                    <Plus className="h-3.5 w-3.5" /> Abonar $100.000
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREAR NUEVO BOLSILLO */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold">Crear Nueva Meta de Ahorro</h3>
            <p className="text-xs text-muted-foreground">
              Define cuánto quieres ahorrar y te ayudaremos a cumplir tu objetivo.
            </p>

            <form onSubmit={handleCrearBolsillo} className="space-y-4">
              <div>
                <Label className="text-xs">Nombre de la Meta</Label>
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Vacaciones en San Andrés"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Meta Financiera (COP)</Label>
                <Input
                  type="number"
                  step="50000"
                  value={nuevaMeta}
                  onChange={(e) => setNuevaMeta(e.target.value)}
                  placeholder="Ej: 2000000"
                  required
                  className="mt-1 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalNuevo(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Crear Meta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
