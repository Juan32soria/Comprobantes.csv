// Tipos compartidos del frontend. Se definen aquí (no se importan de src/lib)
// para mantener el frontend desacoplado de la implementación del API.

export type Estado = "OK" | "REVISAR";

/** Fila tal como la devuelve el API y como se guarda en Google Sheets. */
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

/** Respuesta de POST /api/procesar */
export type RespuestaProcesar =
  | { ok: true; datos: Fila; motivos: string[]; advertencia?: string }
  | { ok: false; error: string };

export type Configurado = { gemini: boolean; sheets: boolean };

/** Respuesta de GET /api/historial */
export type RespuestaHistorial =
  | {
      ok: true;
      filas: Fila[];
      total: number;
      sheetUrl: string | null;
      configurado: Configurado;
    }
  | { ok: false; error: string };

/** Respuesta de POST /api/login. `expiraEn` son segundos de validez del token. */
export type RespuestaLogin =
  | { ok: true; token: string; expiraEn: number }
  | { ok: false; error: string };

/** Estado de cada archivo dentro de la cola de la interfaz. */
export type EstadoArchivo = "pendiente" | "procesando" | "ok" | "revisar" | "error";

export type ArchivoEnCola = {
  id: string;
  file: File;
  estado: EstadoArchivo;
  /** Mensaje corto (p. ej. el error) para mostrar junto al chip. */
  mensaje?: string;
};

/** Resultado de un comprobante ya procesado (éxito o error). */
export type Resultado =
  | {
      id: string;
      archivo: string;
      tipo: "exito";
      datos: Fila;
      motivos: string[];
      advertencia?: string;
    }
  | { id: string; archivo: string; tipo: "error"; error: string };

/** Progreso del lote en curso. */
export type Progreso = { indice: number; total: number; nombre: string };

/** Resumen al terminar un lote. `detenido` indica que el usuario lo paró antes de acabar. */
export type Resumen = {
  total: number;
  ok: number;
  revisar: number;
  error: number;
  /** Cuántos se alcanzaron a procesar (= ok + revisar + error). */
  procesados: number;
  detenido: boolean;
};
