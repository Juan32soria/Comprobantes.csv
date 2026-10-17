// Autenticación simple por contraseña (solo servidor).
// - La contraseña nunca se compara en texto plano: se guarda el SHA-256 de APP_PASSWORD
//   (memoizado) y se compara con el SHA-256 de la contraseña recibida en tiempo constante.
// - Tras un login correcto se emite un JWT (HS256, 24 h) firmado con JWT_SECRET.
import { jwtVerify, SignJWT } from "jose";

/** Duración de la sesión en segundos (24 h). Se devuelve al cliente como `expiraEn`. */
export const DURACION_SESION_SEGUNDOS = 24 * 60 * 60;

export const MENSAJE_SIN_CONFIGURAR =
  "El administrador debe configurar APP_PASSWORD y JWT_SECRET en Vercel";

function passwordConfigurada(): string {
  return process.env.APP_PASSWORD ?? "";
}

function secretoJwt(): string {
  return process.env.JWT_SECRET ?? "";
}

/** True si el servidor tiene APP_PASSWORD y JWT_SECRET. */
export function authConfigurada(): boolean {
  return passwordConfigurada().length > 0 && secretoJwt().length > 0;
}

/**
 * La aplicación siempre exige iniciar sesión. Si el servidor no está configurado,
 * no se deja pasar a nadie (se deniega con el mensaje para el administrador).
 */
export function requiereLogin(): boolean {
  return true;
}

// ---------- Contraseña ----------

async function sha256(texto: string): Promise<Uint8Array> {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return new Uint8Array(resumen);
}

// Hash de APP_PASSWORD calculado una sola vez (de forma perezosa). Se recuerda de qué valor
// se calculó para no quedar desactualizado si la variable cambia en desarrollo.
let hashEsperado: Promise<Uint8Array> | null = null;
let hashEsperadoDe: string | null = null;

function hashPasswordConfigurada(): Promise<Uint8Array> {
  const actual = passwordConfigurada();
  if (hashEsperado === null || hashEsperadoDe !== actual) {
    hashEsperadoDe = actual;
    hashEsperado = sha256(actual);
  }
  return hashEsperado;
}

/** Comparación en tiempo constante: recorre todos los bytes aunque ya difieran. */
function igualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

/** True si la contraseña recibida coincide con APP_PASSWORD (comparando hashes). */
export async function verificarPassword(candidata: string): Promise<boolean> {
  if (!authConfigurada()) return false;
  const [esperado, recibido] = await Promise.all([hashPasswordConfigurada(), sha256(candidata)]);
  return igualesEnTiempoConstante(esperado, recibido);
}

// ---------- Tokens ----------

function claveFirma(): Uint8Array {
  return new TextEncoder().encode(secretoJwt());
}

/** Emite un JWT HS256 válido por 24 h. */
export async function emitirToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setSubject("app")
    .sign(claveFirma());
}

/** True si el token es válido (firma correcta y no vencido). Nunca lanza. */
export async function verificarToken(token: string): Promise<boolean> {
  if (!authConfigurada() || !token) return false;
  try {
    await jwtVerify(token, claveFirma(), { algorithms: ["HS256"], subject: "app" });
    return true;
  } catch {
    return false;
  }
}

/** Extrae el token del header `Authorization: Bearer <token>`. */
function tokenDelRequest(request: Request): string {
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const coincidencia = /^Bearer\s+(\S+)$/i.exec(auth);
  return coincidencia ? coincidencia[1] : "";
}

/**
 * Para usar al inicio de cada handler protegido:
 *   const noAuth = await exigirAuth(request); if (noAuth) return noAuth;
 * Devuelve null si la sesión es válida, o la respuesta 401 que hay que retornar.
 */
export async function exigirAuth(request: Request): Promise<Response | null> {
  if (!authConfigurada()) {
    return Response.json({ ok: false, error: MENSAJE_SIN_CONFIGURAR }, { status: 401 });
  }
  if (!(await verificarToken(tokenDelRequest(request)))) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}
