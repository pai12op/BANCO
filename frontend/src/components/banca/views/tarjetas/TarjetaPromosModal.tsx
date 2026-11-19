import { X } from "lucide-react";

interface TarjetaPromosModalProps {
  open: boolean;
  onClose: () => void;
}

export function TarjetaPromosModal({ open, onClose }: TarjetaPromosModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl border border-[#1a2b4a] bg-[#0a1224] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#182642]">
          <h3 className="font-display font-bold text-lg text-white">
            Beneficios de tu Tarjeta
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-1">
            <p className="font-bold text-emerald-400">Cero cuota de manejo</p>
            <p className="text-slate-300 text-[11px]">No pagas mensualidades por tener o usar tu tarjeta virtual o física.</p>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-3.5 space-y-1">
            <p className="font-bold text-blue-400">20% Descuento en Cafeterías</p>
            <p className="text-slate-300 text-[11px]">Pagando con tu tarjeta en Juan Valdez y marcas seleccionadas.</p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-1">
            <p className="font-bold text-purple-400">Protección de compras Visa</p>
            <p className="text-slate-300 text-[11px]">Seguro contra fraude y clonación respaldado por la franquicia Visa.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-[#0e76fd] py-3 text-xs font-bold text-white transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
