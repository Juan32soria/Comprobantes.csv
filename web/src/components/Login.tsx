"use client";

import { useState, type FormEvent } from "react";
import { IconoDocumento, Spinner } from "./Iconos";

type Props = {
  /** Intenta iniciar sesión; devuelve el mensaje de error o null si entró. */
  onEntrar: (password: string) => Promise<string | null>;
};

/** Pantalla completa de inicio de sesión: se muestra mientras no haya sesión válida. */
export function Login({ onEntrar }: Props) {
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || enviando) return;
    setEnviando(true);
    setError(null);
    const mensaje = await onEntrar(password);
    // Si entró, este componente se desmonta; solo hay que actualizar estado al fallar.
    if (mensaje !== null) {
      setError(mensaje);
      setEnviando(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-lg shadow-black/30 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-acento/15 text-acento"
            aria-hidden="true"
          >
            <IconoDocumento className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
              Extractor de Comprobantes
            </h1>
            <p className="mt-1 text-sm text-apagado">Ingresa la contraseña para continuar</p>
          </div>
        </div>

        <form onSubmit={enviar} className="mt-6 flex flex-col gap-3" noValidate>
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            disabled={enviando}
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : undefined}
            className={`h-10 w-full rounded-md border bg-superficie-2 px-3 text-sm text-texto placeholder:text-apagado focus:border-acento focus:outline-none disabled:opacity-60 ${
              error ? "border-error/60" : "border-borde"
            }`}
          />

          {error && (
            <p id="login-error" role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || enviando}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-acento px-4 text-sm font-semibold text-white transition-colors hover:bg-acento-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando && <Spinner className="h-4 w-4" />}
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
