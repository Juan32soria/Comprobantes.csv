// Utilidades de formato para la interfaz (pesos colombianos, tamaños de archivo).

const formatoPesos = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatoDecimal = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/** 150000 → "$ 150.000"; null/NaN → "—" */
export function formatearPesos(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `$ ${formatoPesos.format(valor)}`;
}

/** 251000 → "245 KB"; 1258291 → "1,2 MB" */
export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${formatoDecimal.format(mb)} MB`;
  return `${formatoDecimal.format(mb / 1024)} GB`;
}

/** Acorta un nombre de archivo conservando la extensión: "comprobante_muy_largo.jpg" → "comprobante_m….jpg" */
export function acortarNombre(nombre: string, max = 24): string {
  if (nombre.length <= max) return nombre;
  const punto = nombre.lastIndexOf(".");
  const ext = punto > 0 ? nombre.slice(punto) : "";
  const base = punto > 0 ? nombre.slice(0, punto) : nombre;
  const disponible = Math.max(4, max - ext.length - 1);
  return `${base.slice(0, disponible)}…${ext}`;
}

/** Texto seguro para celdas: vacío → "—" */
export function oGuion(texto: string | null | undefined): string {
  const limpio = (texto ?? "").trim();
  return limpio === "" ? "—" : limpio;
}
