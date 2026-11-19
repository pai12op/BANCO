// src/services/adminService.ts
// Capa de servicio HTTP desacoplada para Administración y Ventanilla
import { apiGet, apiPost, apiSecurePost } from "@/lib/secureFetch";

export interface DashboardAdminResponse {
  total_clientes: number;
  cuentas_activas: number;
  clientes_bloqueados?: number;
  cuentas_bloqueadas: number;
  saldo_total_banco: number;
}

export const adminService = {
  getDashboard: () =>
    apiGet<DashboardAdminResponse>("/api/admin/dashboard", "Error al cargar métricas del dashboard."),

  getClientes: () =>
    apiGet<{ clientes: any[] }>("/api/admin/clientes", "Error al listar los clientes."),

  getAuditoria: () =>
    apiGet<{ movimientos: any[] }>("/api/admin/movimientos-general", "Error al consultar la auditoría general."),

  toggleEstadoCliente: (usuario_id: number, nuevo_estado_id: number) =>
    apiPost<{ exito: boolean; mensaje: string }>(
      "/api/admin/clientes/estado",
      { usuario_id, nuevo_estado_id },
      "No se pudo cambiar el estado del cliente."
    ),

  consignar: (numero_cuenta: string, valor: number, concepto?: string) =>
    apiSecurePost<{ exito: boolean; mensaje: string; recibo: any }>(
      "/api/admin/consignar",
      { numero_cuenta, valor, concepto },
      "Error al procesar la consignación."
    ),

  crearCliente: (payload: Record<string, unknown>) =>
    apiSecurePost<{ exito: boolean; mensaje: string; cliente: any }>(
      "/api/admin/clientes",
      payload,
      "Error al crear el cliente y su cuenta bancaria."
    ),
};
