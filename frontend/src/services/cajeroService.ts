// src/services/cajeroService.ts
// Capa de servicio HTTP desacoplada para operaciones de Cajero Automático (ATM)
import { apiGet, apiSecurePost } from "@/lib/secureFetch";

export const cajeroService = {
  getSaldo: () =>
    apiGet<{ cuenta?: any; [key: string]: any }>(
      "/api/cajero/saldo",
      "No se pudo consultar el saldo en el cajero."
    ),

  getMovimientos: () =>
    apiGet<{ movimientos: any[] }>(
      "/api/cajero/movimientos",
      "Error al consultar movimientos en pantalla ATM."
    ),

  retirar: (valor: number, codigoOtp: string) =>
    apiSecurePost<{ exito: boolean; mensaje: string; recibo: any }>(
      "/api/cajero/retirar",
      { valor, codigoOtp },
      "No se pudo dispensar el efectivo."
    ),
};
