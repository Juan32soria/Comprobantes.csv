// Llamada a Gemini para extraer los datos del comprobante.
import { GoogleGenAI } from "@google/genai";
import { MODELO, parsearJson, type DatosExtraidos } from "@/lib/comprobantes";
import { PROMPT } from "@/lib/prompt";

/** Header opcional con el que el frontend envía la clave guardada en el navegador. */
export const HEADER_CLAVE = "x-gemini-key";

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

/** Envía la imagen JPEG a Gemini y devuelve los datos ya parseados. */
export async function extraerDatos(imagenJpegBuffer: Buffer, apiKey: string): Promise<DatosExtraidos> {
  if (!apiKey.trim()) {
    throw new Error("No hay clave de API configurada.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const response = await ai.models.generateContent({
    model: MODELO,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imagenJpegBuffer.toString("base64") } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      temperature: 0,
      // El modelo gasta tokens de razonamiento contra este límite; con menos
      // la respuesta sale cortada (MAX_TOKENS).
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
    },
  });
  const texto = response.text ?? "";
  if (!texto.trim()) {
    throw new Error("El modelo devolvió una respuesta vacía.");
  }
  return parsearJson(texto);
}
