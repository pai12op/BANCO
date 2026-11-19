// src/services/authService.ts
// Capa de servicio HTTP desacoplada para autenticación de clientes, administradores y cajero ATM
import { apiPost, apiSecurePost } from "@/lib/secureFetch";
import type { Cuenta, Usuario } from "@/components/banca/types";

export interface RegistroClientePayload {
  tipo_documento_id: number;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  fecha_nacimiento: string;
  tipo_cuenta_id: number;
  password: string;
  pin_cajero: string;
}

export interface LoginClienteResponse {
  exito: boolean;
  mensaje: string;
  usuario: Usuario;
  cuentas: Cuenta[];
}

export interface RegistroClienteResponse {
  exito: boolean;
  mensaje: string;
  cuenta: {
    numero_documento: string;
    numero_cuenta: string;
    titular: string;
    correo: string;
    saldo: number;
  };
}

export interface LoginAdminResponse {
  exito?: boolean;
  requires2FA?: boolean;
  mensaje: string;
  correo_enmascarado?: string;
  codigo_demo?: string;
  admin?: Usuario;
}

export const authService = {
  loginCliente: (identificador: string, password: string) =>
    apiSecurePost<LoginClienteResponse>(
      "/api/auth/login-cliente",
      { identificador, password },
      "Credenciales incorrectas."
    ),

  registroCliente: (payload: RegistroClientePayload) =>
    apiSecurePost<RegistroClienteResponse>(
      "/api/auth/registro-cliente",
      payload as unknown as Record<string, unknown>,
      "No se pudo crear la cuenta bancaria."
    ),

  loginAdmin: (correo: string, password: string) =>
    apiSecurePost<LoginAdminResponse>(
      "/api/auth/login-admin",
      { correo, password },
      "Credenciales administrativas inválidas."
    ),

  verify2FAAdmin: (codigo: string) =>
    apiSecurePost<{ exito: boolean; mensaje: string; admin: any }>(
      "/api/auth/verify-2fa-admin",
      { codigo },
      "Código 2FA incorrecto o no autorizado."
    ),

  resend2FAAdmin: () =>
    apiPost<{ exito: boolean; mensaje: string; codigo_demo?: string }>(
      "/api/auth/resend-2fa-admin",
      undefined,
      "No se pudo generar nuevo código 2FA."
    ),

  loginCajero: (numero_cuenta: string, pin: string) =>
    apiSecurePost<{ exito: boolean; mensaje: string; cuenta: any }>(
      "/api/auth/login-cajero",
      { numero_cuenta, pin },
      "Tarjeta, cuenta o PIN inválido."
    ),

  logout: (modulo?: "cliente" | "admin" | "cajero") =>
    apiPost<{ exito: boolean; mensaje: string }>(
      "/api/auth/logout",
      modulo ? { modulo } : undefined,
      "Error al cerrar sesión."
    ),
};
