// POST /api/procesar: recibe una imagen de comprobante, la analiza con Gemini,
// valida los datos y agrega la fila a Google Sheets.
import sharp from "sharp";
import { construirFila, LADO_MAXIMO, validar, type Fila } from "@/lib/comprobantes";
import { ErrorEntrada, mensajeErrorGemini, mensajeErrorSheets } from "@/lib/errores";
import { extraerDatos, geminiConfigurado } from "@/lib/gemini";
import {
  agregarFila,
  comprobantesExistentes,
  correoCuentaServicio,
  sheetsConfigurado,
} from "@/lib/sheets";

export const runtime = "nodejs";
export const maxDuration = 60;

const TAMANO_MAXIMO = 10 * 1024 * 1024; // ~10 MB
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONES = /\.(jpe?g|png|webp)$/i;

type RespuestaOk = { ok: true; datos: Fila; motivos: string[]; advertencia?: string };
type RespuestaError = { ok: false; error: string };

function json(cuerpo: RespuestaOk | RespuestaError, status = 200): Response {
  return Response.json(cuerpo, { status });
}

type Entrada = { bytes: Buffer; nombre: string; tipo: string };

/** Lee el cuerpo del request: FormData (campo "archivo") o JSON { imagen, nombre }. */
async function leerEntrada(request: Request): Promise<Entrada> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ErrorEntrada("No se pudo leer el formulario enviado.");
    }
    const archivo = form.get("archivo");
    if (!(archivo instanceof File)) {
      throw new ErrorEntrada('Falta el archivo. Envía la imagen en el campo "archivo".');
    }
    if (archivo.size === 0) throw new ErrorEntrada("El archivo está vacío.");
    if (archivo.size > TAMANO_MAXIMO) {
      throw new ErrorEntrada("La imagen supera el tamaño máximo de 10 MB.");
    }
    return {
      bytes: Buffer.from(await archivo.arrayBuffer()),
      nombre: archivo.name || "imagen.jpg",
      tipo: archivo.type,
    };
  }

  if (contentType.includes("application/json")) {
    let cuerpo: unknown;
    try {
      cuerpo = await request.json();
    } catch {
      throw new ErrorEntrada("El cuerpo de la petición no es un JSON válido.");
    }
    if (typeof cuerpo !== "object" || cuerpo === null) {
      throw new ErrorEntrada("El cuerpo debe ser un objeto con los campos imagen y nombre.");
    }
    const { imagen, nombre } = cuerpo as Record<string, unknown>;
    if (typeof imagen !== "string" || !imagen.trim()) {
      throw new ErrorEntrada('Falta el campo "imagen" (base64 o data URL).');
    }
    let tipo = "";
    let base64 = imagen.trim();
    const dataUrl = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(base64);
    if (dataUrl) {
      tipo = dataUrl[1].toLowerCase();
      base64 = dataUrl[2];
    }
    // Tamaño aproximado antes de decodificar (4 caracteres base64 ≈ 3 bytes).
    if ((base64.length * 3) / 4 > TAMANO_MAXIMO) {
      throw new ErrorEntrada("La imagen supera el tamaño máximo de 10 MB.");
    }
    const bytes = Buffer.from(base64.replace(/\s+/g, ""), "base64");
    if (bytes.length === 0) throw new ErrorEntrada("La imagen en base64 no es válida.");
    if (bytes.length > TAMANO_MAXIMO) {
      throw new ErrorEntrada("La imagen supera el tamaño máximo de 10 MB.");
    }
    return {
      bytes,
      nombre: typeof nombre === "string" && nombre.trim() ? nombre.trim() : "imagen.jpg",
      tipo,
    };
  }

  throw new ErrorEntrada(
    "Formato no soportado. Envía multipart/form-data con el campo \"archivo\" o JSON con { imagen, nombre }.",
  );
}

/** Verifica que sea JPEG/PNG/WebP y la convierte a JPEG RGB de máximo 1568 px. */
async function prepararImagen(entrada: Entrada): Promise<Buffer> {
  let formato: string | undefined;
  try {
    formato = (await sharp(entrada.bytes).metadata()).format;
  } catch {
    throw new ErrorEntrada("El archivo no es una imagen válida.");
  }
  const tipoDetectado = formato ? `image/${formato === "jpg" ? "jpeg" : formato}` : "";
  const tipoDeclarado = entrada.tipo.toLowerCase();
  const permitido =
    TIPOS_PERMITIDOS.has(tipoDetectado) ||
    (!formato && (TIPOS_PERMITIDOS.has(tipoDeclarado) || EXTENSIONES.test(entrada.nombre)));
  if (!permitido) {
    throw new ErrorEntrada("Solo se aceptan imágenes JPG, PNG o WebP.");
  }
  try {
    return await sharp(entrada.bytes)
      .rotate() // respeta la orientación EXIF
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // quita transparencia -> RGB
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ErrorEntrada("No se pudo procesar la imagen. Verifica que no esté dañada.");
  }
}

export async function POST(request: Request): Promise<Response> {
  // 1. Entrada e imagen
  let imagenJpeg: Buffer;
  let nombreArchivo: string;
  try {
    const entrada = await leerEntrada(request);
    nombreArchivo = entrada.nombre;
    imagenJpeg = await prepararImagen(entrada);
  } catch (error) {
    if (error instanceof ErrorEntrada) return json({ ok: false, error: error.message }, 400);
    console.error("[procesar] error leyendo la entrada:", error);
    return json({ ok: false, error: "No se pudo leer la imagen enviada." }, 400);
  }

  // 2. Configuración de Gemini
  if (!geminiConfigurado()) {
    return json(
      { ok: false, error: "El administrador debe configurar la clave de API en Vercel (variable GEMINI_API_KEY)." },
      500,
    );
  }

  // 3. Extracción con Gemini
  let datos;
  try {
    datos = await extraerDatos(imagenJpeg);
  } catch (error) {
    console.error("[procesar] error de Gemini:", error);
    return json({ ok: false, error: mensajeErrorGemini(error) }, 500);
  }

  // 4. Sin Sheets: se devuelve lo extraído con una advertencia
  if (!sheetsConfigurado()) {
    const { estado, motivos } = validar(datos, new Set());
    const fila = construirFila(nombreArchivo, datos, estado);
    return json({
      ok: true,
      datos: fila,
      motivos,
      advertencia: "No se guardó en Google Sheets: falta configuración",
    });
  }

  // 5. Validación contra la hoja y guardado
  try {
    const existentes = await comprobantesExistentes();
    const { estado, motivos } = validar(datos, existentes);
    const fila = construirFila(nombreArchivo, datos, estado);
    await agregarFila(fila);
    return json({ ok: true, datos: fila, motivos });
  } catch (error) {
    console.error("[procesar] error de Google Sheets:", error);
    return json({ ok: false, error: mensajeErrorSheets(error, correoCuentaServicio()) }, 500);
  }
}
