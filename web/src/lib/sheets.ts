// Lectura y escritura en Google Sheets con una cuenta de servicio.
import { google, type sheets_v4 } from "googleapis";
import {
  COLUMNAS,
  filaAValores,
  filaDesdeCeldas,
  mapearColumnas,
  type Fila,
} from "@/lib/comprobantes";
import { geminiConfigurado } from "@/lib/gemini";

const RANGO = "A:J"; // sin nombre de pestaña: aplica a la primera hoja

export function sheetsConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID?.trim() && process.env.GOOGLE_SERVICE_ACCOUNT?.trim(),
  );
}

export function configuracion(): { gemini: boolean; sheets: boolean } {
  return { gemini: geminiConfigurado(), sheets: sheetsConfigurado() };
}

export function urlSheet(): string | null {
  const id = process.env.GOOGLE_SHEETS_ID?.trim();
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
}

function idHoja(): string {
  const id = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!id) throw new Error("Falta configurar GOOGLE_SHEETS_ID.");
  return id;
}

type Credenciales = { client_email: string; private_key: string } & Record<string, unknown>;

function tieneCredenciales(valor: unknown): valor is Credenciales {
  if (typeof valor !== "object" || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return typeof obj.client_email === "string" && typeof obj.private_key === "string";
}

/** Parsea el JSON de la cuenta de servicio; repara los "\n" escapados de private_key. */
function leerCredenciales(): Credenciales {
  const crudo = process.env.GOOGLE_SERVICE_ACCOUNT?.trim();
  if (!crudo) throw new Error("Falta configurar GOOGLE_SERVICE_ACCOUNT.");
  let parseado: unknown;
  try {
    parseado = JSON.parse(crudo);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT no es un JSON válido.");
  }
  if (!tieneCredenciales(parseado)) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT debe incluir client_email y private_key.");
  }
  return { ...parseado, private_key: parseado.private_key.replace(/\\n/g, "\n") };
}

/** Correo de la cuenta de servicio (para indicar con quién compartir la hoja). */
export function correoCuentaServicio(): string | null {
  try {
    return leerCredenciales().client_email;
  } catch {
    return null;
  }
}

function clienteSheets(): sheets_v4.Sheets {
  const auth = new google.auth.GoogleAuth({
    credentials: leerCredenciales(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function leerCrudo(sheets: sheets_v4.Sheets): Promise<unknown[][]> {
  const respuesta = await sheets.spreadsheets.values.get({
    spreadsheetId: idHoja(),
    range: RANGO,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const valores: unknown = respuesta.data.values;
  return Array.isArray(valores) ? (valores as unknown[][]) : [];
}

function celdaVacia(c: unknown): boolean {
  return c === null || c === undefined || String(c).trim() === "";
}

/** Lee toda la hoja: encabezados y filas mapeadas por nombre de columna. */
export async function leerFilas(): Promise<{ encabezados: string[]; filas: Fila[] }> {
  const sheets = clienteSheets();
  const crudo = await leerCrudo(sheets);
  if (crudo.length === 0) return { encabezados: [], filas: [] };

  const encabezados = (crudo[0] ?? []).map((v) => (celdaVacia(v) ? "" : String(v)));
  const posiciones = mapearColumnas(encabezados);
  const filas = crudo
    .slice(1)
    .filter((celdas) => celdas.some((c) => !celdaVacia(c)))
    .map((celdas) => filaDesdeCeldas(celdas, posiciones));
  return { encabezados, filas };
}

/** Conjunto de numero_comprobante ya registrados (para detectar duplicados). */
export async function comprobantesExistentes(): Promise<Set<string>> {
  const { filas } = await leerFilas();
  const existentes = new Set<string>();
  for (const fila of filas) {
    if (fila.numero_comprobante) existentes.add(fila.numero_comprobante);
  }
  return existentes;
}

/** Si la hoja está vacía, escribe la fila de encabezados. */
export async function asegurarEncabezados(
  sheets: sheets_v4.Sheets = clienteSheets(),
): Promise<void> {
  const crudo = await leerCrudo(sheets);
  if (crudo.length > 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: idHoja(),
    range: RANGO,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[...COLUMNAS]] },
  });
}

/** Agrega la fila al final de la hoja. Nunca sobreescribe. */
export async function agregarFila(fila: Fila): Promise<void> {
  const sheets = clienteSheets();
  await asegurarEncabezados(sheets);
  await sheets.spreadsheets.values.append({
    spreadsheetId: idHoja(),
    range: RANGO,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [filaAValores(fila)] },
  });
}
