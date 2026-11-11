import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, EyeOff, Lock, Unlock, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Cuenta, Usuario } from "../types";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface TarjetasViewProps {
  usuario: Usuario | null;
  cuentaActiva: Cuenta | null;
}

export function TarjetasView({ usuario, cuentaActiva }: TarjetasViewProps) {
  const [showCvv, setShowCvv] = useState(false);
  const [congelada, setCongelada] = useState(false);
  const [topeCajero, setTopeCajero] = useState("3000000");
  const [topeOnline, setTopeOnline] = useState("5000000");

  const numTarjeta = cuentaActiva?.numero_cuenta
    ? `${cuentaActiva.numero_cuenta.slice(0, 4)} •••• •••• ${cuentaActiva.numero_cuenta.slice(-4)}`
    : "4001 •••• •••• 3040";

  const handleToggleFreeze = () => {
    setCongelada(!congelada);
    if (!congelada) {
      toast.warning("Tarjeta Débito congelada preventivamente. Las transacciones en cajero y compras físicas quedan bloqueadas.");
    } else {
      toast.success("Tarjeta Débito reactivada para uso normal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-border/60 pb-4">
        <h2 className="font-display text-2xl font-bold">Gestión de Tarjetas</h2>
        <p className="text-xs text-muted-foreground">
          Administra tus tarjetas débito y crédito virtuales, topes de seguridad y bloqueo preventivo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TARJETA 1: DÉBITO ASOCIADA A LA CUENTA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Tarjeta Débito Los Andes</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                congelada
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {congelada ? "CONGELADA" : "ACTIVA"}
            </span>
          </div>

          {/* PLÁSTICO VIRTUAL DÉBITO */}
          <div className={`relative aspect-[1.586/1] w-full rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden border ${
            congelada
              ? "bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 border-rose-500/40 opacity-75"
              : "bg-gradient-to-br from-blue-950 via-slate-900 to-black border-cyan-500/30"
          }`}>
            <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

            <div className="relative flex justify-between items-center text-xs">
              <span className="font-display font-bold tracking-widest text-slate-100 text-sm">BANCA VERDE</span>
              <CreditCard className="h-6 w-6 text-cyan-400" />
            </div>

            <div className="relative py-2">
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100">
                {numTarjeta}
              </p>
            </div>

            <div className="relative flex justify-between items-end text-xs font-mono">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Titular</p>
                <p className="font-semibold text-slate-200">
                  {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "JAIRO ANDRÉS PAI"}
                </p>
              </div>

              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Vence</p>
                  <p className="text-slate-200">11/29</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">CVV</p>
                  <p className="text-cyan-300 font-bold">{showCvv ? "482" : "•••"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLES DE SEGURIDAD DÉBITO */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Código de Seguridad (CVV)</p>
                <p className="text-[11px] text-muted-foreground">Para compras virtuales seguras</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCvv(!showCvv)}
                className="h-8 text-xs gap-1"
              >
                {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showCvv ? "Ocultar" : "Mostrar CVV"}
              </Button>
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Bloqueo Preventivo</p>
                <p className="text-[11px] text-muted-foreground">Apaga temporalmente la tarjeta</p>
              </div>
              <Button
                size="sm"
                variant={congelada ? "outline" : "destructive"}
                onClick={handleToggleFreeze}
                className="h-8 text-xs gap-1"
              >
                {congelada ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {congelada ? "Descongelar" : "Congelar"}
              </Button>
            </div>
          </div>
        </div>

        {/* TARJETA 2: CRÉDITO VISA SIGNATURE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Tarjeta de Crédito Visa Signature</h3>
            <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
              CUPO ACTIVO
            </span>
          </div>

          {/* PLÁSTICO VIRTUAL CRÉDITO */}
          <div className="relative aspect-[1.586/1] w-full rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-black border border-indigo-500/30 flex flex-col justify-between overflow-hidden">
            <div className="relative flex justify-between items-center text-xs">
              <span className="font-display font-bold tracking-widest text-slate-100 text-sm">VISA SIGNATURE</span>
              <span className="text-xs font-mono font-bold text-indigo-400">CREDIT</span>
            </div>

            <div className="relative py-2">
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-100">
                5412 •••• •••• 9087
              </p>
            </div>

            <div className="relative flex justify-between items-end text-xs font-mono">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Titular</p>
                <p className="font-semibold text-slate-200">
                  {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "JAIRO ANDRÉS PAI"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Vence</p>
                <p className="text-slate-200">08/29</p>
              </div>
            </div>
          </div>

          {/* RESUMEN DE CUPO DE CRÉDITO */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Cupo Utilizado (38%):</span>
                <span className="font-mono font-bold text-slate-100">$ 3.800.000 / $ 10.000.000</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: "38%" }} />
              </div>
            </div>

            <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground">Cupo Disponible</p>
                <p className="font-mono font-bold text-emerald-400">$ 6.200.000 COP</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Pago Mínimo Próximo</p>
                <p className="font-mono font-bold text-slate-100">$ 245.000 COP</p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => toast.info("No hay cuotas vencidas pendientes de pago.")}
              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Pagar Tarjeta de Crédito
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
