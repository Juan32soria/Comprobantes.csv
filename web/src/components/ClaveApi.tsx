"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Chip } from "./Chip";
import { IconoEditar } from "./Iconos";

type Props = {
  clave: string;
  onGuardar: (clave: string) => void;
  onBorrar: () => void;
};

/** Oculta la clave dejando solo los últimos 4 caracteres visibles. */
function enmascarar(clave: string): string {
  if (clave.length <= 4) return "••••";
  return `••••${clave.slice(-4)}`;
}

/**
 * Campo pequeño del header para pegar la clave de API de Gemini.
 * Solo se muestra cuando el servidor no tiene GEMINI_API_KEY.
 */
export function ClaveApi({ clave, onGuardar, onBorrar }: Props) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");

  // Si no hay clave guardada, el campo se abre solo.
  useEffect(() => {
    if (!clave) setEditando(true);
  }, [clave]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpia = borrador.trim();
    if (!limpia) return;
    onGuardar(limpia);
    setBorrador("");
    setEditando(false);
  };

  if (!editando && clave) {
    return (
      <div className="flex items-center gap-1.5">
        <Chip tono="ok" className="px-2.5 py-1" title="Clave de API guardada en este navegador">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ok" />
          <span>Clave de API: {enmascarar(clave)}</span>
        </Chip>
        <button
          type="button"
          onClick={() => {
            setBorrador("");
            setEditando(true);
          }}
          title="Cambiar la clave de API"
          aria-label="Cambiar la clave de API"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-borde bg-superficie-2 text-apagado transition-colors hover:border-apagado hover:text-texto"
        >
          <IconoEditar className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-1.5">
      <label htmlFor="clave-api" className="sr-only">
        Clave de API de Gemini
      </label>
      <input
        id="clave-api"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        placeholder={clave ? "Nueva clave de API de Gemini" : "Pega tu clave de API de Gemini"}
        className="h-8 w-56 rounded-md border border-alerta/60 bg-superficie-2 px-2.5 text-xs text-texto placeholder:text-apagado focus:border-acento focus:outline-none"
      />
      <button
        type="submit"
        disabled={!borrador.trim()}
        className="h-8 rounded-md bg-acento px-3 text-xs font-semibold text-white transition-colors hover:bg-acento-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Guardar
      </button>
      {clave && (
        <>
          <button
            type="button"
            onClick={() => {
              setBorrador("");
              setEditando(false);
            }}
            className="h-8 rounded-md border border-borde px-3 text-xs font-medium text-texto transition-colors hover:bg-superficie-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onBorrar();
              setBorrador("");
            }}
            title="Quitar la clave guardada en este navegador"
            className="h-8 rounded-md px-2 text-xs font-medium text-apagado transition-colors hover:text-error"
          >
            Quitar
          </button>
        </>
      )}
      {!clave && (
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-apagado underline-offset-2 hover:text-texto hover:underline"
        >
          Obtener clave gratis
        </a>
      )}
    </form>
  );
}
