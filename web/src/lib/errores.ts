// Traducción de errores de Gemini / Google Sheets a mensajes claros en español.

export class ErrorEntrada extends Error {
  // Error causado por la petición del usuario (HTTP 400).
}

function textoError(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`.toLowerCase();
  if (typeof error === "string") return error.toLowerCase();
  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return String(error).toLowerCase();
  }
}

function codigoHttp(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const obj = error as Record<string, unknown>;
  const candidatos = [obj.status, obj.code, (obj.response as Record<string, unknown> | undefined)?.status];
  for (const c of candidatos) {
    if (typeof c === "number") return c;
    if (typeof c === "string" && /^\d{3}$/.test(c)) return Number(c);
  }
  return null;
}

/** Mensaje en español para un fallo al llamar a Gemini. */
export function mensajeErrorGemini(error: unknown): string {
  const texto = textoError(error);
  const codigo = codigoHttp(error);
  if (codigo === 429 || texto.includes("429") || texto.includes("quota") || texto.includes("resource_exhausted") || texto.includes("resource has been exhausted")) {
    return "Se agotó la cuota de Gemini (límite por minuto o por día). Espera un momento y vuelve a intentar.";
  }
  if (codigo === 401 || codigo === 403 || texto.includes("api key") || texto.includes("api_key") || texto.includes("authenticate") || texto.includes("permission_denied") || texto.includes("permission denied")) {
    return "La clave de API de Gemini no es válida. El administrador debe configurar la clave de API en Vercel (GEMINI_API_KEY, se obtiene gratis en https://aistudio.google.com/apikey).";
  }
  if (codigo === 404 || texto.includes("not found") || texto.includes("is not supported")) {
    return "El modelo de Gemini no está disponible para esta clave. Verifica el nombre del modelo o la cuenta.";
  }
  if (codigo !== null && codigo >= 500) {
    return "Gemini no está disponible en este momento (error del servidor). Intenta de nuevo en unos minutos.";
  }
  if (texto.includes("fetch failed") || texto.includes("econnreset") || texto.includes("enotfound") || texto.includes("timeout") || texto.includes("etimedout")) {
    return "No se pudo conectar con Gemini. Revisa la conexión a internet e intenta de nuevo.";
  }
  if (error instanceof Error && /respuesta|json/i.test(error.message)) {
    return `Gemini respondió algo inesperado: ${error.message}`;
  }
  return "Error al analizar la imagen con Gemini. Intenta de nuevo.";
}

/** Mensaje en español para un fallo al leer o escribir en Google Sheets. */
export function mensajeErrorSheets(error: unknown, correoServicio: string | null): string {
  const texto = textoError(error);
  const codigo = codigoHttp(error);
  const compartir = correoServicio
    ? ` Comparte el Google Sheet (como Editor) con ${correoServicio}.`
    : " Comparte el Google Sheet (como Editor) con el correo de la cuenta de servicio.";
  if (error instanceof Error && error.message.startsWith("GOOGLE_SERVICE_ACCOUNT")) {
    return error.message;
  }
  if (codigo === 403 || texto.includes("permission") || texto.includes("forbidden")) {
    return `La cuenta de servicio no tiene permiso en la hoja.${compartir}`;
  }
  if (codigo === 404 || texto.includes("requested entity was not found") || texto.includes("not found")) {
    return `No se encontró el Google Sheet. Revisa GOOGLE_SHEETS_ID.${compartir}`;
  }
  if (codigo === 401 || texto.includes("invalid_grant") || texto.includes("invalid jwt") || texto.includes("decoder") || texto.includes("private key") || texto.includes("pem")) {
    return "Las credenciales de la cuenta de servicio no son válidas. Revisa el JSON de GOOGLE_SERVICE_ACCOUNT (incluida la private_key).";
  }
  if (codigo === 429 || texto.includes("quota") || texto.includes("rate limit")) {
    return "Se agotó la cuota de la API de Google Sheets. Espera un momento y vuelve a intentar.";
  }
  if (texto.includes("unable to parse range") || texto.includes("range")) {
    return "No se pudo leer el rango A:J de la primera pestaña de la hoja.";
  }
  if (texto.includes("fetch failed") || texto.includes("econnreset") || texto.includes("enotfound") || texto.includes("timeout") || texto.includes("etimedout")) {
    return "No se pudo conectar con Google Sheets. Revisa la conexión a internet e intenta de nuevo.";
  }
  return "Error al acceder a Google Sheets. Intenta de nuevo.";
}
