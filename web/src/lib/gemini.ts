// Llamada a Gemini para extraer los datos del comprobante.
import { GoogleGenAI } from "@google/genai";
import { MODELO, parsearJson, type DatosExtraidos } from "@/lib/comprobantes";
import { PROMPT } from "@/lib/prompt";

export function geminiConfigurado(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Envía la imagen JPEG a Gemini y devuelve los datos ya parseados. */
export async function extraerDatos(imagenJpegBuffer: Buffer): Promise<DatosExtraidos> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });
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
