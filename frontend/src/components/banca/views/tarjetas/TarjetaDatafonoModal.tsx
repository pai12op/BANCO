import { useState } from "react";
import { CheckCircle2, Printer, Radio, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/formatters";
import { bancaService } from "@/services/bancaService";

interface TarjetaDatafonoModalProps {
  open: boolean;
  congelada: boolean;
  cuentaId?: number;
  saldoDisponible: number;
  numTarjetaFormateado: string;
  nombreTitular: string;
  onSuccess: () => void;
  onNotify?: (title: string, detail: string) => void;
  onClose: () => void;
}

const COMERCIOS_SUGERIDOS = [
  { name: "Domicilios Llorente", val: "35000", badge: "Destacado" },
  { name: "Juan Valdez Café", val: "18500" },
  { name: "Éxito Manizales", val: "48900" },
  { name: "Cine Colombia", val: "28000" },
];

export function TarjetaDatafonoModal({
  open,
  congelada,
  cuentaId,
  saldoDisponible,
  numTarjetaFormateado,
  nombreTitular,
  onSuccess,
  onNotify,
  onClose,
}: TarjetaDatafonoModalProps) {
  const [datafonoComercio, setDatafonoComercio] = useState("Domicilios Llorente");
  const [datafonoMonto, setDatafonoMonto] = useState("35000");
  const [datafonoProcesando, setDatafonoProcesando] = useState(false);
  const [datafonoExito, setDatafonoExito] = useState(false);
  const [datafonoPaso, setDatafonoPaso] = useState<"comercio" | "pin" | "voucher">("comercio");
  const [datafonoPin, setDatafonoPin] = useState("");
  const [datafonoEstadoTexto, setDatafonoEstadoTexto] = useState("CONECTANDO CON REDEBAN...");
  const [datafonoVoucher, setDatafonoVoucher] = useState<any>(null);
  const [otroComercioActivo, setOtroComercioActivo] = useState(false);
  const [otroComercioNombre, setOtroComercioNombre] = useState("");
  const [otroComercioValor, setOtroComercioValor] = useState("");

  if (!open) return null;

  const handleCerrar = () => {
    setDatafonoPaso("comercio");
    setDatafonoPin("");
    setDatafonoExito(false);
    setDatafonoVoucher(null);
    onClose();
  };

  const handlePasoLectura = () => {
    if (congelada) {
      toast.error("Tu tarjeta se encuentra bloqueada. Desbloquéala antes de pagar.");
      return;
    }

    let valorFinal = parseFloat(datafonoMonto);
    let comercioFinal = datafonoComercio;

    if (otroComercioActivo) {
      if (!otroComercioNombre.trim()) {
        toast.error("Por favor ingrese el nombre del comercio.");
        return;
      }
      valorFinal = parseFloat(otroComercioValor);
      comercioFinal = otroComercioNombre.trim();
    }

    if (isNaN(valorFinal) || valorFinal <= 0) {
      toast.error("Ingrese un monto válido para la compra.");
      return;
    }

    if (valorFinal > saldoDisponible) {
      toast.error(`Fondos insuficientes. Disponible en tu cuenta: ${formatCOP(saldoDisponible)}`);
      return;
    }

    setDatafonoMonto(valorFinal.toString());
    setDatafonoComercio(comercioFinal);
    setDatafonoPin("");
    setDatafonoPaso("pin");
  };

  const handleProcesarPago = async () => {
    if (datafonoPin.length < 4) {
      toast.error("Por favor digite los 4 dígitos de su clave PIN.");
      return;
    }

    try {
      setDatafonoProcesando(true);
      setDatafonoExito(false);
      setDatafonoEstadoTexto("CONECTANDO CON REDEBAN...");
      await new Promise((r) => setTimeout(r, 1100));

      setDatafonoEstadoTexto("VERIFICANDO CHIP Y FONDOS...");
      const montoPago = parseFloat(datafonoMonto);
      const data = await bancaService.pagarTarjetaPos({
        cuenta_id: cuentaId,
        valor: montoPago,
        establecimiento: datafonoComercio,
        pin: datafonoPin,
      });

      await new Promise((r) => setTimeout(r, 900));

      setDatafonoExito(true);
      setDatafonoEstadoTexto("¡TRANSACCIÓN APROBADA!");
      setDatafonoVoucher(data.comprobante);
      onSuccess();

      await new Promise((r) => setTimeout(r, 1400));

      setDatafonoPaso("voucher");
      setDatafonoProcesando(false);
      toast.success("Pago con tarjeta exitoso", {
        description: `Compra aprobada en ${datafonoComercio} por ${formatCOP(montoPago)}.`,
      });
      onNotify?.(
        "Compra con tarjeta aprobada",
        `Pago en ${datafonoComercio} por ${formatCOP(montoPago)}.`
      );
    } catch (err: any) {
      setDatafonoEstadoTexto("TRANSACCIÓN RECHAZADA");
      toast.error(err?.message || "Transacción declinada.");
      await new Promise((r) => setTimeout(r, 1200));
      setDatafonoProcesando(false);
      setDatafonoPin("");
    }
  };

  const handlePinTecla = (tecla: string) => {
    if (tecla === "BORRAR") {
      setDatafonoPin((prev) => prev.slice(0, -1));
    } else if (tecla === "ENTER") {
      handleProcesarPago();
    } else if (datafonoPin.length < 4) {
      setDatafonoPin((prev) => prev + tecla);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-[#223558] bg-[#0a1224] p-5 sm:p-6 shadow-2xl space-y-4 text-center relative overflow-hidden max-h-[95vh] overflow-y-auto">
        <button
          onClick={handleCerrar}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pt-1 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300 border border-cyan-500/20">
            <Radio className="h-3.5 w-3.5 animate-pulse rotate-90" />
            <span>REDEBAN MULTICOLOR • SMART POS 4G</span>
          </div>
          <h3 className="font-display font-bold text-xl text-white mt-1.5">
            Datáfono Electrónico
          </h3>
          <p className="text-xs text-slate-400">
            {datafonoPaso === "comercio" && "Elige o ingresa el comercio y monto a pagar."}
            {datafonoPaso === "pin" && "Digita tu clave PIN secreta de 4 dígitos."}
            {datafonoPaso === "voucher" && "Comprobante comercial térmico emitido."}
          </p>
        </div>

        {datafonoPaso === "comercio" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 font-mono text-emerald-400 shadow-inner space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-emerald-500 tracking-wider">
                <span>TERMINAL POS-MNZ-7749</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Radio className="h-3 w-3 animate-pulse" /> CONTACTLESS
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-300 truncate pt-1">
                {otroComercioActivo ? (otroComercioNombre || "Comercio personalizado") : datafonoComercio}
              </p>
              <p className="text-2xl font-black text-white">
                {formatCOP(otroComercioActivo ? otroComercioValor : datafonoMonto)}
              </p>
              <p className="text-[10px] text-emerald-400/80 pt-0.5">
                ACERQUE LA TARJETA AL LECTOR SUPERIOR
              </p>
            </div>

            {!otroComercioActivo ? (
              <div className="grid grid-cols-2 gap-2 text-left">
                {COMERCIOS_SUGERIDOS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setDatafonoComercio(c.name);
                      setDatafonoMonto(c.val);
                    }}
                    className={`rounded-xl border p-2.5 text-xs font-medium transition-all relative ${
                      datafonoComercio === c.name
                        ? "border-[#0e76fd] bg-[#0e76fd]/20 text-white shadow-md shadow-blue-500/10"
                        : "border-[#192742] bg-[#080d19] text-slate-300 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {c.badge && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        {c.badge}
                      </span>
                    )}
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] font-mono text-cyan-300 mt-0.5">{formatCOP(c.val)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-left rounded-xl border border-[#192742] bg-[#080d19] p-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre del Comercio / Tienda:</label>
                  <input
                    type="text"
                    placeholder="Ej. Tienda de la Esquina"
                    value={otroComercioNombre}
                    onChange={(e) => setOtroComercioNombre(e.target.value)}
                    className="w-full rounded-lg border border-[#223558] bg-[#0b1428] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Valor a Cobrar (COP):</label>
                  <input
                    type="number"
                    placeholder="Ej. 25000"
                    value={otroComercioValor}
                    onChange={(e) => setOtroComercioValor(e.target.value)}
                    className="w-full rounded-lg border border-[#223558] bg-[#0b1428] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOtroComercioActivo(!otroComercioActivo)}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
            >
              {otroComercioActivo ? "← Volver a comercios sugeridos" : "+ Ingresar otro comercio o monto personalizado"}
            </button>

            <button
              onClick={handlePasoLectura}
              disabled={congelada}
              className={`w-full rounded-2xl py-3.5 text-xs font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                congelada
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#0e76fd] to-[#00d2ff] hover:opacity-95 shadow-blue-500/25"
              }`}
            >
              <Radio className="h-4 w-4 rotate-90" />
              <span>Acercar Tarjeta Contactless</span>
            </button>
          </div>
        )}

        {datafonoPaso === "pin" && (
          <div className="space-y-4">
            {datafonoProcesando ? (
              <div className="rounded-3xl border border-emerald-500/50 bg-[#06141a] p-6 font-mono text-emerald-400 shadow-2xl space-y-4 text-center animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] text-emerald-500 border-b border-emerald-900/50 pb-2">
                  <span>TERMINAL POS-MNZ-7749</span>
                  <span className="flex items-center gap-1 font-bold">
                    <Radio className="h-3 w-3 animate-pulse" /> REDEBAN 4G
                  </span>
                </div>

                {!datafonoExito ? (
                  <div className="py-5 space-y-4">
                    <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400/20 animate-ping" />
                      <div className="h-16 w-16 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      <Radio className="absolute h-6 w-6 text-emerald-400 animate-pulse rotate-90" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold tracking-wider text-white animate-pulse uppercase">
                        {datafonoEstadoTexto}
                      </p>
                      <p className="text-xs text-emerald-300 font-semibold">{datafonoComercio}</p>
                      <p className="text-base font-black text-white">{formatCOP(datafonoMonto)}</p>
                    </div>
                    <p className="text-[11px] text-amber-300/90 font-medium">
                      POR FAVOR NO RETIRE SU TARJETA
                    </p>
                  </div>
                ) : (
                  <div className="py-5 space-y-3 animate-in zoom-in-95 duration-200">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-xl shadow-emerald-500/30">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-black tracking-wider text-emerald-300 uppercase">
                        ¡TRANSACCIÓN APROBADA!
                      </p>
                      <p className="text-xs text-slate-300">
                        AUT: <span className="font-bold text-white font-mono">{datafonoVoucher?.autorizacion || "AUTH-OK"}</span>
                      </p>
                      <p className="text-xl font-black text-white">{formatCOP(datafonoMonto)}</p>
                    </div>
                    <p className="text-xs text-emerald-300 font-bold bg-emerald-950/60 py-2 px-3 rounded-xl border border-emerald-500/40">
                      RETIRE SU TARJETA DEL LECTOR
                    </p>
                  </div>
                )}

                <div className="w-full bg-emerald-950/80 rounded-full h-1.5 overflow-hidden border border-emerald-500/30">
                  <div
                    className={`h-full bg-emerald-400 transition-all duration-700 ${
                      datafonoExito ? "w-full" : "w-3/4 animate-pulse"
                    }`}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 font-mono text-emerald-400 shadow-inner space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-emerald-500">
                    <span>CHIP CONTACTLESS DETECTADO</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="text-xs text-emerald-300 truncate font-bold">{datafonoComercio}</p>
                  <p className="text-xl font-black text-white">{formatCOP(datafonoMonto)}</p>
                  <p className="text-[11px] text-emerald-400 pt-1 font-semibold animate-pulse">
                    DIGITE SU CLAVE PIN (4 DÍGITOS)
                  </p>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const tieneDigito = datafonoPin.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`h-9 w-9 rounded-xl border flex items-center justify-center text-lg font-bold transition-all ${
                            tieneDigito
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/30"
                              : "border-emerald-900/60 bg-emerald-950/20 text-emerald-800"
                          }`}
                        >
                          {tieneDigito ? "●" : "—"}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinTecla(num)}
                      className="rounded-xl border border-[#223558] bg-[#0e1933] hover:bg-[#15274d] active:scale-95 py-3 text-sm font-bold text-white shadow transition-all font-mono"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePinTecla("BORRAR")}
                    className="rounded-xl border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/40 active:scale-95 py-3 text-xs font-bold text-rose-300 shadow transition-all"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinTecla("0")}
                    className="rounded-xl border border-[#223558] bg-[#0e1933] hover:bg-[#15274d] active:scale-95 py-3 text-sm font-bold text-white shadow transition-all font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinTecla("ENTER")}
                    disabled={datafonoPin.length < 4}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-600/30 hover:bg-emerald-600/50 active:scale-95 py-3 text-xs font-bold text-emerald-300 shadow transition-all disabled:opacity-40"
                  >
                    Entrar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleProcesarPago}
                  disabled={datafonoPin.length < 4}
                  className="w-full rounded-2xl py-3.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar y Pagar en Datáfono</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDatafonoPaso("comercio")}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ← Cambiar comercio o monto
                </button>
              </>
            )}
          </div>
        )}

        {datafonoPaso === "voucher" && datafonoVoucher && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 text-slate-900 p-4 font-mono text-[11px] shadow-2xl space-y-2 border-dashed border-2 border-slate-300 text-left">
              <div className="text-center border-b border-dashed border-slate-300 pb-2 space-y-0.5">
                <p className="font-black text-sm text-slate-950 tracking-wider">REDEBAN MULTICOLOR</p>
                <p className="text-[10px] text-slate-600 font-semibold">RED TRANSACCIONAL DE PAGOS S.A.</p>
                <p className="text-[9px] text-slate-500">TERMINAL: POS-MNZ-7749 • MANIZALES, COLOMBIA</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">COMERCIO:</span>
                  <span className="font-bold text-slate-900">{datafonoVoucher.establecimiento || datafonoComercio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AUTORIZACIÓN:</span>
                  <span className="font-bold text-slate-900">{datafonoVoucher.autorizacion || "AUTH-OK"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">OP. SISTEMA:</span>
                  <span className="font-semibold text-slate-800">#{datafonoVoucher.operacion_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FECHA:</span>
                  <span className="text-slate-700">{new Date().toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TARJETA:</span>
                  <span className="font-bold text-slate-900">{numTarjetaFormateado}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FRANQUICIA:</span>
                  <span className="font-bold text-slate-900">VISA DÉBITO CONTACTLESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TITULAR:</span>
                  <span className="font-semibold text-slate-800">{nombreTitular}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 my-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-600">SUBTOTAL:</span>
                  <span className="font-bold text-slate-900">{formatCOP(datafonoVoucher.monto)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>IVA (0% INC):</span>
                  <span>$ 0 COP</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>PROPINA VOLUNTARIA:</span>
                  <span>$ 0 COP</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                  <span>TOTAL COBRADO:</span>
                  <span className="text-emerald-700">{formatCOP(datafonoVoucher.monto)}</span>
                </div>
              </div>

              <div className="text-center pt-1 space-y-0.5">
                <p className="font-bold text-xs text-emerald-700 tracking-wide">*** TRANSACCIÓN APROBADA ***</p>
                <p className="text-[10px] text-slate-600">
                  SALDO DISPONIBLE EN CUENTA: <span className="font-bold text-slate-900">{formatCOP(datafonoVoucher.nuevo_saldo)}</span>
                </p>
                <p className="text-[9px] text-slate-400 pt-1">
                  VERIFICADO CON CIFRADO E2E Y BCRYPT
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-[#223558] bg-[#0e1933] hover:bg-[#15274d] py-3 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="h-4 w-4 text-cyan-400" />
                <span>Imprimir Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDatafonoPaso("comercio");
                  setDatafonoPin("");
                  setDatafonoVoucher(null);
                }}
                className="rounded-xl border border-[#0e76fd]/40 bg-[#0e76fd]/20 hover:bg-[#0e76fd]/30 py-3 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Nuevo Pago</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCerrar}
              className="w-full rounded-2xl py-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cerrar Datáfono
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
