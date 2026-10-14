// Llamada a Gemini para extraer los datos del comprobante.
//
// Se usa la API REST directamente con fetch (no el SDK @google/genai): las
// claves nuevas de Gemini empiezan con "AQ." y el SDK las rechaza con
// 401 ACCESS_TOKEN_TYPE_UNSUPPORTED. El endpoint REST acepta ambas.
import { MODELO, parsearJson, type DatosExtraidos } from "@/lib/comprobantes";
import { PROMPT } from "@/lib/prompt";

/** Header opcional con el que el frontend envía la clave guardada en el navegador. */
export const HEADER_CLAVE = "x-gemini-key";

const URL_GENERATE = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

/** Error devuelto por la API de Gemini; `status` permite traducirlo en errores.ts. */
export class ErrorGemini extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = "ErrorGemini";
    this.status = status;
  }
}

/** True si el servidor tiene su propia clave (variable GEMINI_API_KEY en Vercel). */
export function geminiConfigurado(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Decide qué clave usar para esta petición:
 * 1. GEMINI_API_KEY del entorno (tiene prioridad; el header se ignora).
 * 2. El header x-gemini-key enviado por el frontend.
 * Devuelve null si no hay ninguna.
 */
export function resolverClave(request: Request): string | null {
  const delEntorno = process.env.GEMINI_API_KEY?.trim();
  if (delEntorno) return delEntorno;
  const delHeader = request.headers.get(HEADER_CLAVE)?.trim();
  return delHeader ? delHeader : null;
}

/** Forma de la respuesta REST de generateContent (solo lo que se usa). */
type RespuestaGemini = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
};

/** Envía la imagen JPEG a Gemini y devuelve los datos ya parseados. */
export async function extraerDatos(imagenJpegBuffer: Buffer, apiKey: string): Promise<DatosExtraidos> {
  const clave = apiKey.trim();
  if (!clave) {
    throw new Error("No hay clave de API configurada.");
  }

  const response = await fetch(URL_GENERATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": clave,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: imagenJpegBuffer.toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        // El modelo gasta tokens de razonamiento contra este límite; con menos
        // la respuesta sale cortada (MAX_TOKENS).
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    }),
  });

  let data: RespuestaGemini;
  try {
    data = (await response.json()) as RespuestaGemini;
  } catch {
    throw new ErrorGemini(response.status, `Gemini respondió algo que no es JSON (HTTP ${response.status}).`);
  }

  if (data.error || !response.ok) {
    const estado = data.error?.status ? ` ${data.error.status}` : "";
    const mensaje = data.error?.message ?? `HTTP ${response.status}`;
    throw new ErrorGemini(data.error?.code ?? response.status, `${mensaje}${estado}`);
  }

  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!texto.trim()) {
    throw new Error("El modelo devolvió una respuesta vacía.");
  }
  return parsearJson(texto);
}
