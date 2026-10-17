"use client";

/**
 * `fetch` que agrega `Authorization: Bearer <token>`.
 * Si el servidor responde 401 (sesión vencida o inválida) llama a `alNoAutorizado`,
 * que normalmente cierra la sesión y hace que la página vuelva a mostrar el login.
 */
export async function fetchAutenticado(
  url: string,
  init: RequestInit,
  token: string,
  alNoAutorizado?: () => void,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) alNoAutorizado?.();
  return res;
}
