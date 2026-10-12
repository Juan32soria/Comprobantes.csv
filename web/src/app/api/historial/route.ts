// GET /api/historial?limite=20: últimas filas registradas en Google Sheets.
import type { Fila } from "@/lib/comprobantes";
import { mensajeErrorSheets } from "@/lib/errores";
import {
  configuracion,
  correoCuentaServicio,
  leerFilas,
  sheetsConfigurado,
  urlSheet,
} from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 200;

type RespuestaOk = {
  ok: true;
  filas: Fila[];
  total: number;
  sheetUrl: string | null;
  configurado: { gemini: boolean; sheets: boolean };
};
type RespuestaError = { ok: false; error: string };

function leerLimite(request: Request): number {
  const crudo = new URL(request.url).searchParams.get("limite");
  const numero = crudo === null ? NaN : Number.parseInt(crudo, 10);
  if (!Number.isFinite(numero) || numero < 1) return LIMITE_POR_DEFECTO;
  return Math.min(numero, LIMITE_MAXIMO);
}

export async function GET(request: Request): Promise<Response> {
  const limite = leerLimite(request);
  const configurado = configuracion();

  if (!sheetsConfigurado()) {
    const cuerpo: RespuestaOk = { ok: true, filas: [], total: 0, sheetUrl: null, configurado };
    return Response.json(cuerpo);
  }

  try {
    const { filas } = await leerFilas();
    // Más recientes primero: la hoja se llena de arriba hacia abajo.
    const recientes = filas.slice(-limite).reverse();
    const cuerpo: RespuestaOk = {
      ok: true,
      filas: recientes,
      total: filas.length,
      sheetUrl: urlSheet(),
      configurado,
    };
    return Response.json(cuerpo);
  } catch (error) {
    console.error("[historial] error de Google Sheets:", error);
    const cuerpo: RespuestaError = {
      ok: false,
      error: mensajeErrorSheets(error, correoCuentaServicio()),
    };
    return Response.json(cuerpo, { status: 500 });
  }
}
