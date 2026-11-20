// src/services/bancaService.ts
// Capa de servicio HTTP desacoplada para operaciones de Banca Virtual y Tarjetas
import { apiGet, apiPost, apiSecurePost } from "@/lib/secureFetch";
import type { ComprobanteTransferencia, Cuenta, Movimiento, Usuario } from "@/components/banca/types";

export interface TransferenciaPayload {
  cuenta_origen_id?: number | undefined;
  numero_cuenta_destino: string;
  valor: number;
  concepto?: string | undefined;
}

export interface CambioPasswordPayload {
  password_actual: string;
  password_nuevo: string;
  password_confirmacion: string;
  pin_cajero: string;
}

export interface PagoTarjetaPayload {
  cuenta_id?: number | undefined;
  valor: number;
  establecimiento: string;
  pin: string;
}

export interface DestinatarioTransferencia {
  numero_cuenta: string;
  tipo_cuenta: string;
  titular: string;
}

export interface ServerNotification {
  id: number;
  tipo: string;
  titulo: string;
  detalle: string;
  leida: number;
  creada_en: string;
}

export const bancaService = {
  getResumen: () =>
    apiGet<{ usuario: Usuario | null; cuentas: Cuenta[] }>(
      "/api/banca/resumen",
      "Error al consultar el resumen financiero."
    ),

  getMovimientos: (cuentaId: number, endpointBase: "/api/banca" | "/api/usuario" = "/api/banca") =>
    apiGet<{ cuenta: Cuenta; movimientos: Movimiento[] }>(
      `${endpointBase}/movimientos?cuenta_id=${cuentaId}`,
      "Error al consultar los movimientos de la cuenta."
    ),

  getNotificaciones: () =>
    apiGet<{ notificaciones: ServerNotification[]; unread_count: number }>(
      "/api/banca/notificaciones",
      "Error al consultar notificaciones."
    ),

  marcarNotificacionesLeidas: () =>
    apiPost<{ exito: boolean }>(
      "/api/banca/notificaciones/leer",
      {},
      "Error al actualizar notificaciones."
    ),

  consultarDestinatario: (numeroCuenta: string, cuentaOrigenId?: number) =>
    apiGet<DestinatarioTransferencia>(
      `/api/banca/destinatario?numero_cuenta=${encodeURIComponent(numeroCuenta)}${
        cuentaOrigenId ? `&cuenta_origen_id=${cuentaOrigenId}` : ""
      }`,
      "No se pudo verificar la cuenta de destino."
    ),

  transferir: (payload: TransferenciaPayload) =>
    apiSecurePost<{ exito: boolean; mensaje: string; comprobante: ComprobanteTransferencia }>(
      "/api/banca/transferir",
      payload as unknown as Record<string, unknown>,
      "No se pudo realizar la transferencia."
    ),

  actualizarTelefono: (telefono: string) =>
    apiPost<{ exito: boolean; mensaje: string }>(
      "/api/banca/perfil",
      { telefono },
      "Error al actualizar el teléfono."
    ),

  cambiarPassword: (payload: CambioPasswordPayload) =>
    apiSecurePost<{ exito: boolean; mensaje: string }>(
      "/api/banca/password",
      payload as unknown as Record<string, unknown>,
      "Error al actualizar la contraseña."
    ),

  generarCodigoRetiro: (cuenta_id?: number, numero_cuenta?: string) =>
    apiPost<{ exito: boolean; mensaje: string; codigo: string; expira_minutos: number }>(
      "/api/banca/generar-codigo-retiro",
      { cuenta_id, numero_cuenta },
      "No se pudo generar el código de retiro."
    ),

  pagarTarjetaPos: (payload: PagoTarjetaPayload) =>
    apiSecurePost<{ exito: boolean; mensaje: string; comprobante: any }>(
      "/api/usuario/pago-tarjeta",
      payload as unknown as Record<string, unknown>,
      "Transacción declinada en datáfono."
    ),
};
