import { CreditCard } from "lucide-react";
import { toast } from "sonner";

interface TarjetaFisicaModalProps {
  open: boolean;
  onClose: () => void;
  onNotify?: ((title: string, detail: string) => void) | undefined;
}

export function TarjetaFisicaModal({ open, onClose, onNotify }: TarjetaFisicaModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl border border-[#1a2b4a] bg-[#0a1224] p-6 shadow-2xl space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <CreditCard className="h-7 w-7" />
        </div>

        <h3 className="font-display font-bold text-xl text-white">
          Pide tu Tarjeta Física
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Recíbela en tu dirección en <strong className="text-slate-200">Manizales, Caldas</strong> en un plazo de 3 a 5 días hábiles con tecnología Contactless y chip EMV.
        </p>

        <div className="rounded-2xl bg-[#080d19] p-3 border border-[#182642] text-xs font-mono text-left space-y-1">
          <p className="text-slate-400">Costo de emisión: <span className="text-emerald-400 font-bold">$ 0 COP (Gratis)</span></p>
          <p className="text-slate-400">Cuota de manejo: <span className="text-emerald-400 font-bold">$ 0 de por vida</span></p>
          <p className="text-slate-400">Dirección de entrega: <span className="text-white">Universidad de Manizales</span></p>
        </div>

        <button
          onClick={() => {
            toast.success("¡Solicitud enviada con éxito!", {
              description: "Tu tarjeta física Visa Contactless está en camino.",
            });
            onNotify?.("Solicitud de tarjeta física", "Emisión Visa Contactless procesada sin costo.");
            onClose();
          }}
          className="w-full rounded-2xl bg-purple-600 hover:bg-purple-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all"
        >
          Confirmar Solicitud de Tarjeta
        </button>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
