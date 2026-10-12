"use client";

import { useEffect, useState } from "react";
import type { ArchivoEnCola } from "./tipos";
import { ChipArchivo } from "./Chip";
import { acortarNombre, formatearTamano } from "./formato";

type Props = {
  archivos: ArchivoEnCola[];
  onQuitar: (id: string) => void;
  procesando: boolean;
};

/** Miniatura con su propio object URL: se crea al montar y se revoca al desmontar. */
function Miniatura({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!url) return <div className="h-full w-full bg-superficie-2" aria-hidden="true" />;
  // Se usa <img> y no next/image: los blob: URLs no pasan por el optimizador.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

export function ListaArchivos({ archivos, onQuitar, procesando }: Props) {
  if (archivos.length === 0) return null;

  return (
    <section aria-label="Archivos seleccionados">
      <h2 className="mb-2 text-sm font-medium text-apagado">
        {archivos.length} archivo{archivos.length === 1 ? "" : "s"} en cola
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {archivos.map((a) => {
          const bloqueado = procesando || a.estado === "procesando";
          return (
            <li
              key={a.id}
              className="relative flex flex-col overflow-hidden rounded-lg border border-borde bg-superficie"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-superficie-2">
                <Miniatura file={a.file} />
                <button
                  type="button"
                  onClick={() => onQuitar(a.id)}
                  disabled={bloqueado}
                  aria-label={`Quitar ${a.file.name}`}
                  title="Quitar"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-fondo/80 text-base leading-none text-texto backdrop-blur transition-colors hover:bg-acento hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                <p className="truncate text-xs font-medium" title={a.file.name}>
                  {acortarNombre(a.file.name, 26)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-apagado">{formatearTamano(a.file.size)}</span>
                  <ChipArchivo estado={a.estado} />
                </div>
                {a.mensaje && (
                  <p className="truncate text-[11px] text-error" title={a.mensaje}>
                    {a.mensaje}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
