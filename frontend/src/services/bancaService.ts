// src/services/bancaService.ts
// Capa de servicio HTTP desacoplada para operaciones de Banca Virtual y Tarjetas
import { apiGet, apiPost, apiSecurePost } from "@/lib/secureFetch";
import type { ComprobanteTransferencia, Cuenta, Movimiento, Usuario } from "@/components/banca/types";

export interface TransferenciaPayload {
  cuenta_origen_id?: number;
  numero_cuenta_destino: string;
  valor: number;
  concepto?: string;
}

export interface CambioPasswordPayload {
  password_actual: string;
  password_nuevo: string;
  password_confirmacion: string;
  pin_cajero: string;
}

export interface PagoTarjetaPayload {
  cuenta_id?: number;
  valor: number;
  establecimiento: string;
  pin: string;
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
