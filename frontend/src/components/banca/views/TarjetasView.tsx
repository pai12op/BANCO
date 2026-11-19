import { useState, useEffect } from "react";
import {
  CreditCard, Eye, EyeOff, Lock, Unlock, FileText,
  DollarSign, Radio, Copy, Check, Sparkles, ShoppingBag,
  ArrowDownLeft, ArrowUpRight, Search, X, CheckCircle2, ShieldCheck, Tag,
  Printer, RefreshCw, KeyRound, Store
} from "lucide-react";
import { toast } from "sonner";
import { securePost } from "@/lib/secureFetch";
import { Cuenta, Movimiento, Usuario } from "../types";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface TarjetasViewProps {
  usuario: Usuario | null;
  cuentaActiva: Cuenta | null;
  onRefreshResumen?: () => void;
  onNotify?: (title: string, detail: string) => void;
}

export function TarjetasView({ usuario, cuentaActiva, onRefreshResumen, onNotify }: TarjetasViewProps) {
  // Estado de giro 3D de la tarjeta (frente / reverso)
  const [flipped, setFlipped] = useState(false);
  const [tipoTarjeta, setTipoTarjeta] = useState<"debito" | "credito">("debito");
  const [showCvv, setShowCvv] = useState(false);
  const [showNumeroCompleto, setShowNumeroCompleto] = useState(false);
  const [congelada, setCongelada] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modales de acciones
  const [modalMovimientos, setModalMovimientos] = useState(false);
  const [modalDatafono, setModalDatafono] = useState(false);
  const [modalFisica, setModalFisica] = useState(false);
  const [modalPromos, setModalPromos] = useState(false);

  // Estados de formularios
  const [datafonoComercio, setDatafonoComercio] = useState("Domicilios Llorente");
  const [datafonoMonto, setDatafonoMonto] = useState("35000");
  const [datafonoProcesando, setDatafonoProcesando] = useState(false);
  const [datafonoExito, setDatafonoExito] = useState(false);

  // Flujo profesional de datáfono 3 pasos (Comercio -> PIN de 4 dígitos -> Voucher Redeban)
  const [datafonoPaso, setDatafonoPaso] = useState<"comercio" | "pin" | "voucher">("comercio");
  const [datafonoPin, setDatafonoPin] = useState("");
  const [datafonoVoucher, setDatafonoVoucher] = useState<any>(null);
  const [datafonoEstadoTexto, setDatafonoEstadoTexto] = useState("CONECTANDO CON REDEBAN...");
  const [otroComercioActivo, setOtroComercioActivo] = useState(false);
  const [otroComercioNombre, setOtroComercioNombre] = useState("");
  const [otroComercioValor, setOtroComercioValor] = useState("");

  // Movimientos de la tarjeta
  const [movimientosTarjeta, setMovimientosTarjeta] = useState<Movimiento[]>([]);
  const [searchMovimiento, setSearchMovimiento] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "COMPRAS" | "INGRESOS">("TODOS");

  const saldoDisponible = cuentaActiva ? (parseFloat(cuentaActiva.saldo as any) || 0) : 0;
  const nombreTitular = usuario
    ? `${usuario.nombres.split(" ")[0]} ${usuario.apellidos.split(" ")[0]}`.toUpperCase()
    : "TITULAR DE CUENTA";

  const numCuenta = cuentaActiva?.numero_cuenta || "4093882177343040";
  // Generar número estándar de 16 dígitos para la tarjeta (frecuente en Colombia: prefijo 4001/4093)
  const fullCardNumber = numCuenta.length >= 16
    ? numCuenta
    : (numCuenta + "5566").slice(0, 16);

  const numTarjetaFormateado = showNumeroCompleto
    ? `${fullCardNumber.slice(0, 4)} ${fullCardNumber.slice(4, 8)} ${fullCardNumber.slice(8, 12)} ${fullCardNumber.slice(12, 16)}`
    : `${fullCardNumber.slice(0, 4)} •••• •••• ${fullCardNumber.slice(-4)}`;

  // Cargar movimientos desde MySQL
  const cargarMovimientos = async () => {
    if (!cuentaActiva) return;
    try {
      const res = await fetch(`/api/usuario/movimientos?cuenta_id=${cuentaActiva.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMovimientosTarjeta(data.movimientos || []);
      }
    } catch (e) {
      console.error(e);
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

  // Flujo Datáfono: Paso 1 a Paso 2 (Lectura y verificación previa)
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
      toast.error(`Fondos insuficientes. Disponible en tu cuenta: ${fmt(saldoDisponible)}`);
      return;
    }

    setDatafonoMonto(valorFinal.toString());
    setDatafonoComercio(comercioFinal);
    setDatafonoPin("");
    setDatafonoPaso("pin");
  };

  // Teclado numérico en pantalla del datáfono
  const handlePinTecla = (tecla: string) => {
    if (tecla === "BORRAR") {
      setDatafonoPin((prev) => prev.slice(0, -1));
    } else if (tecla === "ENTER") {
      handleProcesarPagoDatafono();
    } else {
      if (datafonoPin.length < 4) {
        setDatafonoPin((prev) => prev + tecla);
      }
    }
  };

  // Procesar pago en Datáfono con simulación realista de tiempos (Conectando -> Verificando -> Aprobada)
  const handleProcesarPagoDatafono = async () => {
    if (datafonoPin.length < 4) {
      toast.error("Por favor digite los 4 dígitos de su clave PIN.");
      return;
    }

    try {
      setDatafonoProcesando(true);
      setDatafonoExito(false);
      setDatafonoEstadoTexto("CONECTANDO CON REDEBAN...");

      // 1. Simular conexión con la red transaccional (~1.3s)
      await new Promise((resolve) => setTimeout(resolve, 1300));

      setDatafonoEstadoTexto("VERIFICANDO CHIP Y FONDOS...");

      const res = await securePost("/api/usuario/pago-tarjeta", {
        cuenta_id: cuentaActiva?.id,
        valor: parseFloat(datafonoMonto),
        establecimiento: datafonoComercio,
        pin: datafonoPin,
      });

      const data = await res.json();

      // 2. Simular autorización bancaria (~1.1s)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      if (!res.ok) {
        setDatafonoEstadoTexto("TRANSACCIÓN RECHAZADA");
        toast.error(data.error || "Transacción declinada.");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setDatafonoProcesando(false);
        setDatafonoPin("");
        return;
      }

      // 3. ¡Transacción Aprobada!
      setDatafonoExito(true);
      setDatafonoEstadoTexto("¡TRANSACCIÓN APROBADA!");
      setDatafonoVoucher(data.comprobante);
      cargarMovimientos();
      if (onRefreshResumen) onRefreshResumen();

      // 4. Mostrar pantalla de Aprobada / Retire su tarjeta durante 1.8s antes de emitir el voucher
      await new Promise((resolve) => setTimeout(resolve, 1800));

      setDatafonoPaso("voucher");
      setDatafonoProcesando(false);
      const montoPago = parseFloat(datafonoMonto) || 0;
      toast.success("Pago con tarjeta exitoso", {
        description: `Compra aprobada en ${datafonoComercio} por ${fmt(montoPago)}.`,
      });
      onNotify?.(
        "Compra con tarjeta aprobada",
        `Pago en ${datafonoComercio} por ${fmt(montoPago)}.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Error de comunicación segura con el datáfono.");
      setDatafonoProcesando(false);
    }
  };

  const handleCerrarDatafono = () => {
    setModalDatafono(false);
    setDatafonoPaso("comercio");
    setDatafonoPin("");
    setDatafonoExito(false);
    setDatafonoVoucher(null);
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

      {/* ======================================================== */}
      {/* MODAL 1: HISTORIAL DE MOVIMIENTOS DE LA TARJETA          */}
      {/* ======================================================== */}
      {modalMovimientos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-[#1a2b4a] bg-[#0a1224] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#182642]">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Movimientos de tu Tarjeta
                </h3>
                <p className="text-xs text-slate-400">
                  Transacciones en vivo conectadas al núcleo bancario seguro
                </p>
              </div>
              <button
                onClick={() => setModalMovimientos(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* BUSCADOR Y FILTROS */}
            <div className="space-y-2">
              <div className="flex items-center rounded-xl border border-[#172542] bg-[#080d19] px-3 py-2 text-xs">
                <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar compra o establecimiento..."
                  value={searchMovimiento}
                  onChange={(e) => setSearchMovimiento(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="flex gap-2">
                {(["TODOS", "COMPRAS", "INGRESOS"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all ${
                      filtroTipo === tipo
                        ? "bg-[#0e76fd] text-white shadow-sm"
                        : "bg-[#080d19] text-slate-400 hover:text-white border border-[#16233d]"
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTA CON SCROLL */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#141f36] pr-1">
              {movimientosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No se encontraron movimientos registrados para este filtro.
                </div>
              ) : (
                movimientosFiltrados.map((m) => {
                  const esIngreso = m.sentido === "CREDITO";
                  return (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
                            esIngreso
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-[#111c33] text-slate-300"
                          }`}
                        >
                          {esIngreso ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ShoppingBag className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {m.descripcion || m.tipo_operacion}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(m.fecha_hora).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right pl-3 shrink-0">
                        <p
                          className={`font-mono text-xs font-bold ${
                            esIngreso ? "text-emerald-400" : "text-slate-100"
                          }`}
                        >
                          {esIngreso ? `+${fmt(m.valor)}` : `-${fmt(m.valor)}`}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          Saldo: {fmt(m.saldo_resultante)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SIMULADOR DE DATÁFONO PROFESIONAL REDEBAN       */}
      {/* ======================================================== */}
      {modalDatafono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#223558] bg-[#0a1224] p-5 sm:p-6 shadow-2xl space-y-4 text-center relative overflow-hidden max-h-[95vh] overflow-y-auto">
            <button
              onClick={handleCerrarDatafono}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ENCABEZADO */}
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

            {/* ================= PASO 1: SELECCIÓN DE COMERCIO Y MONTO ================= */}
            {datafonoPaso === "comercio" && (
              <div className="space-y-4">
                {/* PANTALLA LCD DEL DATÁFONO */}
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
                    {fmt(parseFloat(otroComercioActivo ? otroComercioValor : datafonoMonto) || 0)}
                  </p>
                  <p className="text-[10px] text-emerald-400/80 pt-0.5">
                    ACERQUE LA TARJETA AL LECTOR SUPERIOR
                  </p>
                </div>

                {/* BOTONES DE COMERCIOS PREDEFINIDOS */}
                {!otroComercioActivo ? (
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {[
                      { name: "Domicilios Llorente", val: "35000", badge: "Destacado" },
                      { name: "Juan Valdez Café", val: "18500" },
                      { name: "Éxito Manizales", val: "48900" },
                      { name: "Cine Colombia", val: "28000" },
                    ].map((c) => (
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
                        <p className="text-[10px] font-mono text-cyan-300 mt-0.5">{fmt(parseFloat(c.val))}</p>
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

                {/* BOTÓN TOGGLE OTRO COMERCIO */}
                <button
                  type="button"
                  onClick={() => setOtroComercioActivo(!otroComercioActivo)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  {otroComercioActivo ? "← Volver a comercios sugeridos" : "+ Ingresar otro comercio o monto personalizado"}
                </button>

                {/* BOTÓN ACERCAR TARJETA AL DATÁFONO */}
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

            {/* ================= PASO 2: DIGITACIÓN DE PIN EN DATÁFONO ================= */}
            {datafonoPaso === "pin" && (
              <div className="space-y-4">
                {datafonoProcesando ? (
                  /* PANTALLA LCD DURANTE LA SIMULACIÓN DE PROCESAMIENTO (CONECTANDO -> VERIFICANDO -> APROBADA) */
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
                          <p className="text-base font-black text-white">{fmt(parseFloat(datafonoMonto) || 0)}</p>
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
                          <p className="text-xl font-black text-white">{fmt(parseFloat(datafonoMonto) || 0)}</p>
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
                    {/* PANTALLA LCD NORMAL CON CLAVE PIN */}
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 font-mono text-emerald-400 shadow-inner space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-emerald-500">
                        <span>CHIP CONTACTLESS DETECTADO</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xs text-emerald-300 truncate font-bold">{datafonoComercio}</p>
                      <p className="text-xl font-black text-white">{fmt(parseFloat(datafonoMonto) || 0)}</p>
                      <p className="text-[11px] text-emerald-400 pt-1 font-semibold animate-pulse">
                        DIGITE SU CLAVE Y PRESIONE ENTER
                      </p>

                      {/* VISOR DE DÍGITOS MASCARADOS */}
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

                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-1.5 text-[11px] text-cyan-300 flex items-center justify-between">
                      <span>Clave de tu tarjeta:</span>
                      <span className="font-mono font-bold text-white bg-cyan-500/30 px-2 py-0.5 rounded">1234</span>
                    </div>

                    {/* TECLADO NUMÉRICO DEL DATÁFONO */}
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

                    {/* BOTÓN ACCIÓN DIRECTA */}
                    <button
                      type="button"
                      onClick={handleProcesarPagoDatafono}
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

            {/* ================= PASO 3: VOUCHER TÉRMICO REDEBAN ================= */}
            {datafonoPaso === "voucher" && datafonoVoucher && (
              <div className="space-y-4">
                {/* VOUCHER FÍSICO ESTILO TICKET DE PAPEL TÉRMICO */}
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
                      <span className="font-bold text-slate-900">{datafonoVoucher.autorizacion || "# 849201"}</span>
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
                      <span className="font-bold text-slate-900">{fmt(parseFloat(datafonoVoucher.monto))}</span>
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
                      <span className="text-emerald-700">{fmt(parseFloat(datafonoVoucher.monto))}</span>
                    </div>
                  </div>

                  <div className="text-center pt-1 space-y-0.5">
                    <p className="font-bold text-xs text-emerald-700 tracking-wide">*** TRANSACCIÓN APROBADA ***</p>
                    <p className="text-[10px] text-slate-600">
                      SALDO DISPONIBLE EN CUENTA: <span className="font-bold text-slate-900">{fmt(datafonoVoucher.nuevo_saldo)}</span>
                    </p>
                    <p className="text-[9px] text-slate-400 pt-1">
                      VERIFICADO CON PIN CRIPTOGRÁFICO SHA-256
                    </p>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN PARA EL VOUCHER */}
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
                  onClick={handleCerrarDatafono}
                  className="w-full rounded-2xl py-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cerrar Datáfono
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: PEDIR TARJETA FÍSICA                            */}
      {/* ======================================================== */}
      {modalFisica && (
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
                toast.success("¡Solicitud enviada! Tu tarjeta física está en camino.");
                setModalFisica(false);
              }}
              className="w-full rounded-2xl bg-purple-600 hover:bg-purple-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all"
            >
              Confirmar Solicitud de Tarjeta
            </button>
            <button
              onClick={() => setModalFisica(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: BENEFICIOS Y PROMOS                             */}
      {/* ======================================================== */}
      {modalPromos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#1a2b4a] bg-[#0a1224] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#182642]">
              <h3 className="font-display font-bold text-lg text-white">
                Beneficios de tu Tarjeta
              </h3>
              <button
                onClick={() => setModalPromos(false)}
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
              onClick={() => setModalPromos(false)}
              className="w-full rounded-2xl bg-[#0e76fd] py-3 text-xs font-bold text-white transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
