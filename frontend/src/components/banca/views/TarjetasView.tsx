import { useState, useEffect } from "react";
import {
  CreditCard, Eye, EyeOff, Lock, Unlock, FileText,
  DollarSign, Radio, Copy, Check, Sparkles, ShieldCheck, Tag, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/formatters";
import { bancaService } from "@/services/bancaService";
import { Cuenta, Movimiento, Usuario } from "../types";
import { TarjetaMovimientosModal } from "./tarjetas/TarjetaMovimientosModal";
import { TarjetaDatafonoModal } from "./tarjetas/TarjetaDatafonoModal";
import { TarjetaFisicaModal } from "./tarjetas/TarjetaFisicaModal";
import { TarjetaPromosModal } from "./tarjetas/TarjetaPromosModal";

const fmt = formatCOP;

interface TarjetasViewProps {
  usuario: Usuario | null;
  cuentaActiva: Cuenta | null;
  onRefreshResumen?: () => void;
  onNotify?: (title: string, detail: string) => void;
}

export function TarjetasView({ usuario, cuentaActiva, onRefreshResumen, onNotify }: TarjetasViewProps) {
  const [flipped, setFlipped] = useState(false);
  const [tipoTarjeta, setTipoTarjeta] = useState<"debito" | "credito">("debito");
  const [showCvv, setShowCvv] = useState(false);
  const [showNumeroCompleto, setShowNumeroCompleto] = useState(false);
  const [congelada, setCongelada] = useState(false);
  const [copied, setCopied] = useState(false);

  const [modalMovimientos, setModalMovimientos] = useState(false);
  const [modalDatafono, setModalDatafono] = useState(false);
  const [modalFisica, setModalFisica] = useState(false);
  const [modalPromos, setModalPromos] = useState(false);

  const [movimientosTarjeta, setMovimientosTarjeta] = useState<Movimiento[]>([]);
  const [searchMovimiento, setSearchMovimiento] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "COMPRAS" | "INGRESOS">("TODOS");

  const saldoDisponible = cuentaActiva ? (parseFloat(cuentaActiva.saldo as any) || 0) : 0;
  const nombreTitular = usuario
    ? `${usuario.nombres.split(" ")[0]} ${usuario.apellidos.split(" ")[0]}`.toUpperCase()
    : "TITULAR DE CUENTA";

  const numCuenta = cuentaActiva?.numero_cuenta || "4093882177343040";
  const fullCardNumber = numCuenta.length >= 16 ? numCuenta : (numCuenta + "5566").slice(0, 16);

  const numTarjetaFormateado = showNumeroCompleto
    ? `${fullCardNumber.slice(0, 4)} ${fullCardNumber.slice(4, 8)} ${fullCardNumber.slice(8, 12)} ${fullCardNumber.slice(12, 16)}`
    : `${fullCardNumber.slice(0, 4)} •••• •••• ${fullCardNumber.slice(-4)}`;

  const cargarMovimientos = async () => {
    if (!cuentaActiva) return;
    try {
      const data = await bancaService.getMovimientos(cuentaActiva.id, "/api/usuario");
      setMovimientosTarjeta(data.movimientos || []);
    } catch {
      // Silencioso en precarga de historial de tarjeta
    }
  };

  useEffect(() => {
    cargarMovimientos();
  }, [cuentaActiva]);

  const handleCopyNumero = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullCardNumber);
    setCopied(true);
    toast.success(`Número copiado: ${fullCardNumber}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFreeze = () => {
    const nuevoEstado = !congelada;
    setCongelada(nuevoEstado);
    if (nuevoEstado) {
      toast.warning("Tarjeta Bloqueada: Compras en datáfono y pagos en línea quedan desactivados preventivamente.");
    } else {
      toast.success("Tarjeta Desbloqueada: Tu tarjeta está activa y lista para usar.");
    }
  };

  const movimientosFiltrados = movimientosTarjeta.filter((m) => {
    const desc = (m.descripcion || m.tipo_operacion || "").toLowerCase();
    const matchSearch = desc.includes(searchMovimiento.toLowerCase()) || m.valor.toString().includes(searchMovimiento);
    if (!matchSearch) return false;
    if (filtroTipo === "COMPRAS") return m.sentido === "DEBITO";
    if (filtroTipo === "INGRESOS") return m.sentido === "CREDITO";
    return true;
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* HEADER DE LA SECCIÓN FIEL AL ESTILO NEQUI */}
      <div className="flex items-center justify-between border-b border-[#18253d] pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            {tipoTarjeta === "debito" ? "Tu Tarjeta Nequi / Débito" : "Tu Tarjeta Visa Signature"}
          </h2>
          <p className="text-xs text-slate-400">
            Toca la tarjeta para voltearla en 3D y ver tus datos seguros.
          </p>
        </div>

        {/* SELECTOR DÉBITO / CRÉDITO */}
        <div className="flex rounded-xl bg-[#091122] p-1 border border-[#1b2b48]">
          <button
            onClick={() => setTipoTarjeta("debito")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tipoTarjeta === "debito"
                ? "bg-[#0e76fd] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Débito
          </button>
          <button
            onClick={() => setTipoTarjeta("credito")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tipoTarjeta === "credito"
                ? "bg-[#0e76fd] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Crédito
          </button>
        </div>
      </div>

      {/* CONTENEDOR 3D FLIP CARD TIPO NEQUI */}
      <div className="perspective-1000 w-full py-2">
        <div
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest('[data-interactive="true"]')) {
              return;
            }
            setFlipped(!flipped);
          }}
          className={`relative aspect-[1.586/1] w-full max-w-[400px] mx-auto cursor-pointer rounded-3xl shadow-2xl transition-transform duration-700 transform-style-3d select-none ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* ======================================================== */}
          {/* CARA 1: FRENTE DE LA TARJETA (SALDO DISPONIBLE + VISA)   */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 backface-hidden rounded-3xl p-6 flex flex-col justify-between overflow-hidden border shadow-2xl transition-all ${
              flipped ? "pointer-events-none" : "pointer-events-auto"
            } ${
              congelada
                ? "bg-slate-900/90 border-rose-500/40 grayscale"
                : tipoTarjeta === "debito"
                ? "bg-gradient-to-br from-[#5b166d] via-[#2d0f47] to-[#120524] border-fuchsia-500/30 text-white"
                : "bg-gradient-to-br from-[#0a1e3b] via-[#09152b] to-[#040912] border-cyan-500/30 text-white"
            }`}
          >
            {/* ARTE ILUSTRATIVO POP-ART FINTECH (ESTILO NEQUI) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
                <circle cx="40" cy="40" r="30" fill="currentColor" />
                <rect x="180" y="20" width="70" height="70" rx="15" fill="currentColor" />
                <path d="M 220 160 Q 250 120 280 160" stroke="currentColor" strokeWidth="12" fill="none" />
                <circle cx="230" cy="140" r="6" fill="currentColor" />
                <circle cx="270" cy="140" r="6" fill="currentColor" />
                <circle cx="80" cy="160" r="22" fill="currentColor" />
              </svg>
            </div>

            {/* HEADER DEL FRENTE: INDICADOR Y CHIP */}
            <div className="relative flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {/* CHIP CONTACTLESS */}
                <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-sm flex items-center justify-center">
                  <div className="h-4 w-6 border border-amber-800/40 rounded-sm" />
                </div>
                <Radio className="h-5 w-5 text-white/80 rotate-90" />
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md border border-white/10">
                <span>Toca para girar</span>
                <RefreshCw className="h-3 w-3 text-cyan-300" />
              </div>
            </div>

            {/* CENTRO DEL FRENTE: TU SALDO DISPONIBLE EN PILL BLANCO FIEL A NEQUI */}
            <div className="relative z-10 flex flex-col items-center justify-center py-2 text-center">
              <span className="text-xs font-medium text-white/90 drop-shadow">
                Tu saldo
              </span>
              <span className="text-[10px] text-white/70 mb-1.5">
                (En tu Disponible)
              </span>

              {/* PILL BLANCO DE SALDO */}
              <div className="rounded-2xl bg-white px-5 py-2 shadow-xl border border-slate-200">
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {fmt(tipoTarjeta === "debito" ? saldoDisponible : 0)}
                </span>
              </div>
            </div>

            {/* FOOTER DEL FRENTE: FRANQUICIA VISA Y TITULAR */}
            <div className="relative z-10 flex items-end justify-between">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-white/70">Titular</p>
                <p className="font-semibold text-xs sm:text-sm text-white tracking-wide">
                  {nombreTitular}
                </p>
              </div>

              <div className="text-right">
                <span className="font-display font-black text-2xl tracking-tighter italic text-white drop-shadow-md">
                  VISA
                </span>
                <p className="text-[9px] font-mono text-white/80 uppercase -mt-1 tracking-widest">
                  {tipoTarjeta === "debito" ? "Débito" : "Signature"}
                </p>
              </div>
            </div>

            {/* OVERLAY DE BLOQUEO PREVENTIVO */}
            {congelada && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-4">
                <Lock className="h-10 w-10 text-rose-400 mb-2 animate-bounce" />
                <p className="font-display font-bold text-base text-white">TARJETA BLOQUEADA</p>
                <p className="text-xs text-slate-300 mt-1">Bloqueo de seguridad preventivo activo</p>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* CARA 2: REVERSO DE LA TARJETA (DATOS, CVV, COPIAR NÚMERO) */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 rotate-y-180 backface-hidden rounded-3xl p-6 flex flex-col justify-between overflow-hidden border shadow-2xl transition-all ${
              flipped ? "pointer-events-auto z-10" : "pointer-events-none z-0"
            } ${
              congelada
                ? "bg-slate-900/90 border-rose-500/40 grayscale"
                : tipoTarjeta === "debito"
                ? "bg-gradient-to-br from-[#2a0b36] via-[#1a0724] to-[#0e0314] border-fuchsia-500/40 text-white"
                : "bg-gradient-to-br from-[#061225] via-[#040c1a] to-[#02060d] border-cyan-500/40 text-white"
            }`}
          >
            {/* BOTÓN COPIAR NÚMERO SUPERIOR DERECHO */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                BANCO ANDINO VIRTUAL
              </span>

              <button
                type="button"
                data-interactive="true"
                onClick={handleCopyNumero}
                className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 text-xs font-semibold text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "¡Copiado!" : "Copiar número"}</span>
              </button>
            </div>

            {/* NÚMERO DE LA TARJETA CLICKABLE PARA VER / OCULTAR */}
            <div
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                setShowNumeroCompleto(!showNumeroCompleto);
              }}
              className="my-2 space-y-1.5 rounded-2xl bg-white/5 hover:bg-white/10 p-3 border border-white/10 cursor-pointer transition-all"
              title="Haz clic para ver u ocultar el número completo"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                  Número de la Tarjeta
                </span>
                <button
                  type="button"
                  data-interactive="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNumeroCompleto(!showNumeroCompleto);
                  }}
                  className="text-xs text-[#38bdf8] hover:text-[#00d2ff] font-semibold flex items-center gap-1.5"
                >
                  {showNumeroCompleto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showNumeroCompleto ? "Ocultar" : "Ver número"}</span>
                </button>
              </div>

              <p className="font-mono text-lg sm:text-xl font-bold tracking-widest text-white drop-shadow">
                {numTarjetaFormateado}
              </p>
            </div>

            {/* FECHA DE EXPIRACIÓN Y CVV CLICKABLE */}
            <div className="grid grid-cols-2 gap-4 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
              <div>
                <p className="text-[10px] uppercase text-slate-400">Fecha de expiración</p>
                <p className="font-mono text-sm font-bold text-white mt-0.5">10/28</p>
              </div>

              <div
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCvv(!showCvv);
                }}
                className="cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors"
                title="Haz clic para ver u ocultar CVV"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase text-slate-400">Código CVV</p>
                  <button
                    type="button"
                    data-interactive="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCvv(!showCvv);
                    }}
                    className="text-[10px] text-[#38bdf8] font-semibold hover:underline"
                  >
                    {showCvv ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                  {showCvv ? "482" : "•••"}
                </p>
              </div>
            </div>

            {/* TITULAR INFERIOR */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold tracking-wider text-slate-200">
                {nombreTitular}
              </span>
              <span className="text-[10px] text-slate-400">Toca para regresar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LOS 4 BOTONES DE ACCIÓN RÁPIDA EXACTOS A NEQUI          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-4 gap-2.5 pt-2">
        {/* 1. MOVIMIENTOS */}
        <button
          onClick={() => setModalMovimientos(true)}
          className="flex flex-col items-center gap-2 rounded-2xl bg-[#091122] hover:bg-[#0e1b33] border border-[#162544] p-3 text-center transition-all group"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#132342] text-[#38bdf8] group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-200 leading-tight">
            Movimientos
          </span>
        </button>

        {/* 2. VER DATOS SEGUROS */}
        <button
          onClick={() => {
            setShowNumeroCompleto((v) => !v);
            setShowCvv((v) => !v);
            toast.info("Seguridad: Número y CVV alternados en pantalla.");
          }}
          className="flex flex-col items-center gap-2 rounded-2xl bg-[#091122] hover:bg-[#0e1b33] border border-[#162544] p-3 text-center transition-all group"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#132342] text-[#38bdf8] group-hover:scale-110 transition-transform">
            <Eye className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-200 leading-tight">
            Ver datos seguros
          </span>
        </button>

        {/* 3. PAGA EN DATÁFONO */}
        <button
          onClick={() => setModalDatafono(true)}
          className="flex flex-col items-center gap-2 rounded-2xl bg-[#091122] hover:bg-[#0e1b33] border border-[#162544] p-3 text-center transition-all group"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#132342] text-[#38bdf8] group-hover:scale-110 transition-transform">
            <Radio className="h-5 w-5 rotate-90" />
          </div>
          <span className="text-[11px] font-semibold text-slate-200 leading-tight">
            Paga en datáfono
          </span>
        </button>

        {/* 4. BLOQUEA TU TARJETA */}
        <button
          onClick={handleToggleFreeze}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all group ${
            congelada
              ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
              : "bg-[#091122] hover:bg-[#0e1b33] border-[#162544] text-slate-200"
          }`}
        >
          <div
            className={`grid h-11 w-11 place-items-center rounded-2xl transition-transform group-hover:scale-110 ${
              congelada ? "bg-rose-500/20 text-rose-400" : "bg-[#132342] text-[#38bdf8]"
            }`}
          >
            {congelada ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <span className="text-[11px] font-semibold leading-tight">
            {congelada ? "Desbloquea" : "Bloquea tu Tarjeta"}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN: ¿QUÉ MÁS QUIERES HACER? (EXACTA A NEQUI)        */}
      {/* ======================================================== */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          ¿Qué más quieres hacer?
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalFisica(true)}
            className="flex items-center gap-3 rounded-2xl border border-[#162544] bg-[#080e1b] p-4 text-left transition-all hover:border-[#0e76fd]/50 hover:bg-[#0d1629]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Pide tu Tarjeta física</p>
              <p className="text-[10px] text-slate-400">Entregas a domicilio</p>
            </div>
          </button>

          <button
            onClick={() => setModalPromos(true)}
            className="flex items-center gap-3 rounded-2xl border border-[#162544] bg-[#080e1b] p-4 text-left transition-all hover:border-[#0e76fd]/50 hover:bg-[#0d1629]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Conoce promos y beneficios</p>
              <p className="text-[10px] text-slate-400">Cashback y convenios</p>
            </div>
          </button>
        </div>
      </div>

      <TarjetaMovimientosModal
        open={modalMovimientos}
        movimientos={movimientosFiltrados}
        searchMovimiento={searchMovimiento}
        filtroTipo={filtroTipo}
        onSearchChange={setSearchMovimiento}
        onFiltroChange={setFiltroTipo}
        onClose={() => setModalMovimientos(false)}
      />

      <TarjetaDatafonoModal
        open={modalDatafono}
        congelada={congelada}
        cuentaId={cuentaActiva?.id}
        saldoDisponible={saldoDisponible}
        numTarjetaFormateado={numTarjetaFormateado}
        nombreTitular={nombreTitular}
        onSuccess={() => {
          cargarMovimientos();
          onRefreshResumen?.();
        }}
        onNotify={onNotify}
        onClose={() => setModalDatafono(false)}
      />

      <TarjetaFisicaModal
        open={modalFisica}
        onClose={() => setModalFisica(false)}
        onNotify={onNotify}
      />

      <TarjetaPromosModal
        open={modalPromos}
        onClose={() => setModalPromos(false)}
      />
    </div>
  );
}
