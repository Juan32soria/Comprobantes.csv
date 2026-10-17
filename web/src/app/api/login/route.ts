// POST /api/login: recibe { password } y, si coincide con APP_PASSWORD, devuelve un JWT de 24 h.
import {
  authConfigurada,
  DURACION_SESION_SEGUNDOS,
  emitirToken,
  MENSAJE_SIN_CONFIGURAR,
  verificarPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

type RespuestaOk = { ok: true; token: string; expiraEn: number };
type RespuestaError = { ok: false; error: string };

function json(cuerpo: RespuestaOk | RespuestaError, status = 200): Response {
  return Response.json(cuerpo, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (!authConfigurada()) {
    return json({ ok: false, error: MENSAJE_SIN_CONFIGURAR }, 500);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return json({ ok: false, error: "El cuerpo de la petición no es un JSON válido." }, 400);
  }

  const password =
    typeof cuerpo === "object" && cuerpo !== null
      ? (cuerpo as Record<string, unknown>).password
      : undefined;

  if (typeof password !== "string" || !(await verificarPassword(password))) {
    return json({ ok: false, error: "Contraseña incorrecta" }, 401);
  }

  const token = await emitirToken();
  return json({ ok: true, token, expiraEn: DURACION_SESION_SEGUNDOS });
}
