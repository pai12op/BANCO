export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  numero_documento: string;
  tipo_documento: string;
}

export interface Cuenta {
  id: number;
  numero_cuenta: string;
  saldo: number;
  tipo_cuenta: string;
  estado_cuenta: string;
}

export interface Movimiento {
  id: number;
  sentido: "DEBITO" | "CREDITO";
  tipo_movimiento?: string;
  valor: number;
  saldo_resultante?: number;
  fecha_hora: string;
  descripcion: string;
  tipo_operacion: string;
  canal: string;
}

export interface ComprobanteTransferencia {
  numero_operacion: number;
  fecha: string;
  cuenta_origen: string;
  cuenta_destino: string;
  valor: number;
  nuevo_saldo_origen: number;
}

export type BancaTab = "inicio" | "cuentas" | "transferencias" | "tarjetas" | "ahorros" | "prestamos" | "ajustes";
