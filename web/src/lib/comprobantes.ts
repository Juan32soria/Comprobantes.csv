// Tipos y lógica pura de validación/construcción de filas.
// Portado de procesar_comprobantes.py (parsear_json, validar, construir_fila, ...).

export const MODELO = "gemini-3.5-flash-lite";
// Principal: flash-lite (menos tokens, más cuota). Respaldo si responde 503 (saturado): el flash completo.
export const MODELO_RESPALDO = "gemini-3.8-flash";
export const LADO_MAXIMO = 1568; // px en el lado más largo

export const COLUMNAS = [
  "fecha_procesado",
  "archivo_origen",
  "banco_app",
  "numero_comprobante",
  "numero_cuenta_o_llave",
  "tipo_cuenta_o_llave",
  "nombre_cliente",
  "valor_pago",
  "fecha_pago",
  "estado",
] as const;

export type Columna = (typeof COLUMNAS)[number];

// Nombres de columna de versiones anteriores -> nombre actual.
export const COLUMNAS_VIEJAS: Record<string, Columna> = {
  numero_cuenta: "numero_cuenta_o_llave",
};

export type Estado = "OK" | "REVISAR";

export type Fila = {
  fecha_procesado: string;
  archivo_origen: string;
  banco_app: string;
  numero_comprobante: string;
  numero_cuenta_o_llave: string;
  tipo_cuenta_o_llave: string;
  nombre_cliente: string;
  valor_pago: number | null;
  fecha_pago: string;
  estado: Estado;
};

// Datos tal como los devuelve el modelo (sin garantías de tipo).
export type DatosExtraidos = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Extrae el objeto JSON de la respuesta, tolerando marcas de código. */
export function parsearJson(texto: string): DatosExtraidos {
  let limpio = texto.trim();
  limpio = limpio.replace(/^```(?:json)?\s*/, "");
  limpio = limpio.replace(/\s*```$/, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La respuesta del modelo no contiene JSON.");
  }
  let datos: unknown;
  try {
    datos = JSON.parse(limpio.slice(inicio, fin + 1));
  } catch {
    throw new Error("La respuesta del modelo no es un JSON válido.");
  }
  if (!esObjeto(datos)) {
    throw new Error("La respuesta del modelo no es un objeto JSON.");
  }
  return datos;
}

export function limpiarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

/** Convierte el valor del pago a entero, tolerando formatos como "150.000". */
export function normalizarValor(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? Math.trunc(valor) : null;
  }
  const digitos = String(valor).replace(/[^\d]/g, "");
  if (!digitos) return null;
  const numero = Number.parseInt(digitos, 10);
  return Number.isSafeInteger(numero) ? numero : null;
}

/** Fecha estricta AAAA-MM-DD y que además exista en el calendario. */
export function fechaValida(texto: unknown): boolean {
  if (typeof texto !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/** Cuenta, celular o llave del remitente; acepta la clave vieja numero_cuenta. */
export function leerCuentaOLlave(datos: DatosExtraidos): string {
  const cuenta = limpiarTexto(datos["numero_cuenta_o_llave"]);
  return cuenta || limpiarTexto(datos["numero_cuenta"]);
}

/** Aplica validaciones. Devuelve estado y lista de motivos (mismas reglas que Python). */
export function validar(
  datos: DatosExtraidos,
  comprobantesExistentes: ReadonlySet<string>,
): { estado: Estado; motivos: string[] } {
  const motivos: string[] = [];
  const comprobante = limpiarTexto(datos["numero_comprobante"]);
  const cuenta = leerCuentaOLlave(datos);
  const nombre = limpiarTexto(datos["nombre_cliente"]);
  const valor = normalizarValor(datos["valor_pago"]);
  const fecha = limpiarTexto(datos["fecha_pago"]);

  if (!comprobante) {
    motivos.push("falta el numero de comprobante");
  } else if (comprobantesExistentes.has(comprobante)) {
    motivos.push("comprobante ya registrado antes (posible pago duplicado)");
  }

  // En Nequi, Bre-B y Daviplata el nombre del remitente no aparece: solo se
  // revisa si no hay nada que lo identifique.
  if (!nombre && !cuenta) {
    motivos.push("no se puede identificar al remitente (faltan nombre y cuenta o llave)");
  }

  if (valor === null || valor <= 0) {
    motivos.push("falta el valor del pago o no es valido");
  }

  if (!fecha) {
    motivos.push("falta la fecha del pago");
  } else if (!fechaValida(fecha)) {
    motivos.push("la fecha no tiene el formato esperado");
  }

  const estado: Estado = motivos.length === 0 ? "OK" : "REVISAR";
  return { estado, motivos };
}

/** Fecha y hora actual en Bogotá con formato AAAA-MM-DD HH:mm. */
export function fechaProcesadoAhora(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const v = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((p) => p.type === tipo)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")} ${v("hour")}:${v("minute")}`;
}

export function construirFila(
  nombreArchivo: string,
  datos: DatosExtraidos,
  estado: Estado,
): Fila {
  return {
    fecha_procesado: fechaProcesadoAhora(),
    archivo_origen: nombreArchivo,
    banco_app: limpiarTexto(datos["banco_app"]),
    numero_comprobante: limpiarTexto(datos["numero_comprobante"]),
    numero_cuenta_o_llave: leerCuentaOLlave(datos),
    tipo_cuenta_o_llave: limpiarTexto(datos["tipo_cuenta_o_llave"]),
    nombre_cliente: limpiarTexto(datos["nombre_cliente"]),
    valor_pago: normalizarValor(datos["valor_pago"]),
    fecha_pago: limpiarTexto(datos["fecha_pago"]),
    estado,
  };
}

/** Convierte la fila al arreglo de celdas en el orden de COLUMNAS. */
export function filaAValores(fila: Fila): (string | number)[] {
  return COLUMNAS.map((columna) => {
    const valor = fila[columna];
    return valor === null ? "" : valor;
  });
}

function esColumna(nombre: string): nombre is Columna {
  return (COLUMNAS as readonly string[]).includes(nombre);
}

/** Devuelve {columna: posición desde 0} según la fila de encabezados. */
export function mapearColumnas(encabezados: readonly unknown[]): Map<Columna, number> {
  const posiciones = new Map<Columna, number>();
  encabezados.forEach((valor, indice) => {
    const crudo = limpiarTexto(valor).toLowerCase();
    const nombre = COLUMNAS_VIEJAS[crudo] ?? crudo;
    if (esColumna(nombre) && !posiciones.has(nombre)) {
      posiciones.set(nombre, indice);
    }
  });
  if (posiciones.size === 0) {
    COLUMNAS.forEach((columna, indice) => posiciones.set(columna, indice));
  }
  return posiciones;
}

/** Convierte una fila cruda de la hoja (celdas) en Fila usando el mapa de columnas. */
export function filaDesdeCeldas(
  celdas: readonly unknown[],
  posiciones: ReadonlyMap<Columna, number>,
): Fila {
  const celda = (columna: Columna): unknown => {
    const indice = posiciones.get(columna);
    return indice === undefined ? undefined : celdas[indice];
  };
  const estadoCrudo = limpiarTexto(celda("estado")).toUpperCase();
  return {
    fecha_procesado: limpiarTexto(celda("fecha_procesado")),
    archivo_origen: limpiarTexto(celda("archivo_origen")),
    banco_app: limpiarTexto(celda("banco_app")),
    numero_comprobante: limpiarTexto(celda("numero_comprobante")),
    numero_cuenta_o_llave: limpiarTexto(celda("numero_cuenta_o_llave")),
    tipo_cuenta_o_llave: limpiarTexto(celda("tipo_cuenta_o_llave")),
    nombre_cliente: limpiarTexto(celda("nombre_cliente")),
    valor_pago: normalizarValor(celda("valor_pago")),
    fecha_pago: limpiarTexto(celda("fecha_pago")),
    estado: estadoCrudo === "OK" ? "OK" : "REVISAR",
  };
}
