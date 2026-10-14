"use client";

import { useCallback, useEffect, useState } from "react";

const CLAVE_STORAGE = "gemini_api_key";

/** Nombre del header con el que se envía la clave al API. */
export const HEADER_CLAVE = "x-gemini-key";

/**
 * Clave de API de Gemini guardada en el navegador (localStorage).
 * Solo se usa cuando el servidor no tiene GEMINI_API_KEY configurada.
 */
export function useClaveApi() {
  const [clave, setClave] = useState<string>("");
  // Hasta que se lea localStorage (solo en el cliente) no se sabe si hay clave.
  const [lista, setLista] = useState(false);

  useEffect(() => {
    try {
      setClave(window.localStorage.getItem(CLAVE_STORAGE)?.trim() ?? "");
    } catch {
      // localStorage bloqueado (modo privado, etc.): se sigue sin clave guardada.
    }
    setLista(true);
  }, []);

  const guardar = useCallback((nueva: string) => {
    const limpia = nueva.trim();
    setClave(limpia);
    try {
      if (limpia) window.localStorage.setItem(CLAVE_STORAGE, limpia);
      else window.localStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // Si no se puede persistir, al menos queda en memoria durante la sesión.
    }
  }, []);

  const borrar = useCallback(() => guardar(""), [guardar]);

  return { clave, lista, guardar, borrar };
}
