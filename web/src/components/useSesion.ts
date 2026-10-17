"use client";

import { useCallback, useEffect, useState } from "react";
import type { RespuestaLogin } from "./tipos";

/** Clave de localStorage donde se guarda el JWT de la sesión. */
const SESION_STORAGE = "sesion_token";

/**
 * Lee el claim `exp` del JWT SIN verificar la firma (eso lo hace el servidor).
 * Solo sirve para saber en el cliente si el token ya venció.
 */
function expiracion(token: string): number | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const relleno = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True si el token tiene un `exp` futuro. */
function vigente(token: string): boolean {
  const exp = expiracion(token);
  return exp !== null && exp * 1000 > Date.now();
}

function esRespuestaLogin(valor: unknown): valor is RespuestaLogin {
  return typeof valor === "object" && valor !== null && "ok" in valor;
}

/**
 * Sesión de la aplicación guardada en el navegador (localStorage).
 * Un token ausente o vencido equivale a no estar autenticado.
 */
export function useSesion() {
  const [token, setToken] = useState<string>("");
  // Hasta que se lea localStorage (solo en el cliente) no se sabe si hay sesión.
  const [lista, setLista] = useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(SESION_STORAGE) ?? "";
      if (guardado && vigente(guardado)) setToken(guardado);
      else if (guardado) window.localStorage.removeItem(SESION_STORAGE);
    } catch {
      // localStorage bloqueado (modo privado, etc.): se sigue sin sesión.
    }
    setLista(true);
  }, []);

  const cerrarSesion = useCallback(() => {
    setToken("");
    try {
      window.localStorage.removeItem(SESION_STORAGE);
    } catch {
      // Si no se puede borrar, al menos se olvida en memoria.
    }
  }, []);

  // Cuando el token venza mientras la página sigue abierta, se cierra la sesión solo.
  useEffect(() => {
    if (!token) return;
    const exp = expiracion(token);
    if (exp === null) return;
    const restante = Math.max(0, exp * 1000 - Date.now());
    const temporizador = setTimeout(cerrarSesion, restante);
    return () => clearTimeout(temporizador);
  }, [token, cerrarSesion]);

  /** Envía la contraseña a POST /api/login. Devuelve el mensaje de error o null si entró. */
  const iniciarSesion = useCallback(async (password: string): Promise<string | null> => {
    let res: Response;
    try {
      res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      return "No se pudo conectar con el servidor.";
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return `Respuesta inválida del servidor (HTTP ${res.status}).`;
    }
    if (!esRespuestaLogin(json)) {
      return `Respuesta inesperada del servidor (HTTP ${res.status}).`;
    }
    if (!json.ok) return json.error || "No se pudo iniciar sesión.";
    if (typeof json.token !== "string" || !json.token) {
      return "El servidor no devolvió un token de sesión.";
    }

    setToken(json.token);
    try {
      window.localStorage.setItem(SESION_STORAGE, json.token);
    } catch {
      // Si no se puede persistir, la sesión dura mientras la pestaña esté abierta.
    }
    return null;
  }, []);

  return { token, lista, autenticado: token !== "", iniciarSesion, cerrarSesion };
}
