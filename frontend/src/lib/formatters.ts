// src/lib/formatters.ts
// Formateadores financieros compartidos en toda la interfaz
const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return copFormatter.format(Number.isFinite(num) ? num : 0);
}
