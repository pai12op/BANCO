import { Check, Copy, Landmark, X } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/formatters";
import { saveCajeroHandoff } from "@/lib/secureFetch";
import type { Cuenta } from "./types";

interface ModalSacarPlataProps {
  open: boolean;
  loadingCodigo: boolean;
  codigoRetiro: string | null;
  cuentaActiva: Cuenta | null;
  saldoReal: number;
  copiadoCodigo: boolean;
  copiadoCuenta: boolean;
  onClose: () => void;
  onCopy: (texto: string, tipo: "codigo" | "cuenta") => void;
}

export function ModalSacarPlata({
  open,
  loadingCodigo,
  codigoRetiro,
  cuentaActiva,
  saldoReal,
  copiadoCodigo,
  copiadoCuenta,
  onClose,
  onCopy,
}: ModalSacarPlataProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl border border-[#1d2f50] bg-[#091224] p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white leading-tight">
                Sacar Dinero en Cajero
              </h3>
              <p className="text-[11px] text-slate-400">Retiro sin tarjeta con código único</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingCodigo ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-400">Generando tu código de retiro seguro...</p>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0b1b36] to-[#071122] p-4 text-center space-y-2.5 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                Tu Código de Retiro (Válido 30 min)
              </p>

              <div className="flex items-center justify-center gap-3">
                <p
                  onClick={() => onCopy(codigoRetiro || "", "codigo")}
                  title="Haz clic para copiar"
                  className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white cursor-pointer hover:text-cyan-300 transition-colors select-all"
                >
                  {codigoRetiro ? `${codigoRetiro.slice(0, 3)} ${codigoRetiro.slice(3)}` : "------"}
                </p>

                <button
                  type="button"
                  onClick={() => onCopy(codigoRetiro || "", "codigo")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md ${
                    copiadoCodigo
                      ? "bg-emerald-500 text-slate-950 shadow-emerald-500/40 scale-105"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-blue-500/25"
                  }`}
                  title="Copiar código de retiro"
                >
                  {copiadoCodigo ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {copiadoCodigo ? (
                <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/50 py-1.5 px-3 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>¡Código copiado al portapapeles!</span>
                </div>
              ) : (
                <p className="text-[10px] text-emerald-400 font-medium">
                  ● Código activo de un solo uso en Cajeros ATM
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#060b14] p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Número de Cuenta:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">
                    {cuentaActiva?.numero_cuenta || "Sin cuenta"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopy(cuentaActiva?.numero_cuenta || "", "cuenta")}
                    className={`grid h-6 w-6 place-items-center rounded-md text-[10px] transition-all ${
                      copiadoCuenta
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                    title="Copiar número de cuenta"
                  >
                    {copiadoCuenta ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Saldo Disponible:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCOP(saldoReal)}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 p-3 space-y-1 text-slate-300 text-[11px]">
              <p className="font-bold text-white mb-0.5">¿Cómo retirar en el Cajero?</p>
              <p>1. Ingresa a la pantalla del Cajero Virtual.</p>
              <p>2. Ingresa tu número de cuenta: <span className="font-mono font-bold text-cyan-300">{cuentaActiva?.numero_cuenta || "Tu cuenta"}</span></p>
              <p>3. Digita tu código generado: <span className="font-mono font-bold text-cyan-300">{codigoRetiro}</span></p>
            </div>

            <button
              disabled={loadingCodigo || !codigoRetiro || codigoRetiro === "null"}
              onClick={() => {
                if (!codigoRetiro || codigoRetiro === "null" || !cuentaActiva?.numero_cuenta) {
                  toast.error("El código de retiro aún no ha sido generado.");
                  return;
                }
                saveCajeroHandoff(cuentaActiva.numero_cuenta, codigoRetiro);
                window.location.href = "/cajero";
              }}
              className="w-full rounded-xl bg-gradient-to-r from-[#0e76fd] to-[#00d2ff] hover:opacity-95 active:scale-95 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Landmark className="h-4 w-4" />
              <span>Entrar al Cajero Virtual con este Código →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
