import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Check, FileText, Download, ShieldCheck, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Cuenta, Movimiento, Usuario } from "../types";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface CuentasViewProps {
  usuario: Usuario | null;
  cuentas: Cuenta[];
  cuentaActiva: Cuenta | null;
  movimientos: Movimiento[];
  onSelectCuenta: (cuenta: Cuenta) => void;
  onOpenTransferir: () => void;
}

export function CuentasView({
  usuario,
  cuentas,
  cuentaActiva,
  movimientos,
  onSelectCuenta,
  onOpenTransferir,
}: CuentasViewProps) {
  const [copied, setCopied] = useState(false);
  const [certModal, setCertModal] = useState(false);

  const numCuenta = cuentaActiva?.numero_cuenta || "400110203040";
  const saldo = cuentaActiva?.saldo || 1000000;

  const handleCopy = () => {
    navigator.clipboard.writeText(numCuenta);
    setCopied(true);
    toast.success("Número de cuenta copiado al portapapeles.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Mis Cuentas Bancarias</h2>
          <p className="text-xs text-muted-foreground">
            Consulta el estado, saldo disponible y certificaciones de tus productos financieros.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCertModal(true)}
            className="text-xs gap-1.5 h-9"
          >
            <FileText className="h-3.5 w-3.5" /> Certificado Bancario
          </Button>
          <Button
            size="sm"
            onClick={onOpenTransferir}
            className="text-xs gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Wallet className="h-3.5 w-3.5" /> Transferir Fondos
          </Button>
        </div>
      </div>

      {/* TARJETA DETALLADA DE LA CUENTA ACTIVA */}
      <div className="rounded-2xl border border-primary/40 bg-gradient-card p-6 shadow-xl relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-sheen" />

        <div className="relative grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                ● {cuentaActiva?.estado_cuenta || "ACTIVA"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {cuentaActiva?.tipo_cuenta || "Cuenta de Ahorros"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">
              Saldo Disponible Hoy
            </p>
            <p className="font-display text-4xl font-bold text-white mt-1">
              {fmt(saldo)}
            </p>
            <p className="text-xs text-slate-300 mt-2">
              Saldo en canje: <span className="font-mono text-cyan-300">$ 0 COP</span> · Saldo total: <span className="font-mono font-semibold text-white">{fmt(saldo)}</span>
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-card/60 p-4 border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Número de Cuenta</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xl font-bold text-slate-100">{numCuenta}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Copiar número"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground">Titular</p>
                <p className="font-semibold text-slate-200 truncate">
                  {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Titular de la Cuenta"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Identificación</p>
                <p className="font-mono text-slate-200">
                  {usuario ? `${usuario.tipo_documento || "CC"} ${usuario.numero_documento}` : "Sin información"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA COMPLETA DE CUENTAS */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3">Tus Productos Registrados</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(cuentas && cuentas.length > 0 ? cuentas : (cuentaActiva ? [cuentaActiva] : [])).map((c) => {
            const isActiva = cuentaActiva?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCuenta(c)}
                className={`cursor-pointer rounded-xl border p-5 transition-all ${
                  isActiva
                    ? "border-primary/50 bg-card shadow-md ring-1 ring-primary/20 hover:border-primary"
                    : "border-border bg-card/60 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{c.tipo_cuenta || "Cuenta de Ahorros"}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    isActiva ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-secondary text-muted-foreground"
                  }`}>
                    {isActiva ? "PRINCIPAL" : "SECUNDARIA"}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-1">{c.numero_cuenta}</p>
                <p className="font-display text-2xl font-bold text-foreground mt-3">{fmt(parseFloat(c.saldo as any) || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Conectada a base de datos MySQL</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXTRACTO RECIENTE DE LA CUENTA */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-bold">Movimientos de la Cuenta</h3>
            <p className="text-xs text-muted-foreground">Últimas transacciones registradas</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {movimientos.length} movimiento(s)
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {movimientos.slice(0, 5).map((m) => {
            const esCredito = m.sentido === "CREDITO" || m.tipo_movimiento === "CREDITO";
            return (
              <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-lg ${
                      esCredito ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {esCredito ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{m.descripcion || m.tipo_operacion}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Canal: {m.canal} · {new Date(m.fecha_hora).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-bold ${esCredito ? "text-emerald-400" : "text-slate-300"}`}>
                    {esCredito ? "+" : "-"}{fmt(m.valor)}
                  </span>
                  {m.saldo_resultante !== undefined && (
                    <p className="font-mono text-[11px] text-muted-foreground">Saldo: {fmt(m.saldo_resultante)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CERTIFICACIÓN BANCARIA SIMULADA */}
      {certModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-display text-lg font-bold">Certificación Bancaria Oficial</h3>
              </div>
              <button
                type="button"
                onClick={() => setCertModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="bg-white text-slate-900 p-6 rounded-lg font-sans text-xs space-y-3 border">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-sm tracking-wider">BANCA ROTA S.A.</p>
                <p className="text-[10px] text-slate-600">NIT: 901.458.789-2 · Manizales, Caldas</p>
              </div>

              <p className="pt-2 font-semibold text-center uppercase tracking-wider text-[11px]">
                A QUIEN PUEDA INTERESAR
              </p>

              <p className="text-justify leading-relaxed">
                Certificamos que el(la) señor(a) <strong>{usuario?.nombres} {usuario?.apellidos}</strong>, identificado(a) con <strong>{usuario?.tipo_documento} No. {usuario?.numero_documento}</strong>, es titular en nuestra entidad de la siguiente cuenta activa:
              </p>

              <div className="rounded bg-slate-100 p-3 font-mono space-y-1">
                <p><strong>Tipo de Producto:</strong> {cuentaActiva?.tipo_cuenta || "Cuenta de Ahorros"}</p>
                <p><strong>Número de Cuenta:</strong> {numCuenta}</p>
                <p><strong>Estado:</strong> ACTIVA</p>
                <p><strong>Fecha de Expedición:</strong> {new Date().toLocaleDateString("es-CO")}</p>
              </div>

              <p className="text-[10px] text-slate-500 text-center pt-2">
                Código Único de Validación Digital: BDA-{Math.floor(100000 + Math.random() * 900000)}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Descargar PDF
              </Button>
              <Button size="sm" onClick={() => setCertModal(false)} className="text-xs">
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
