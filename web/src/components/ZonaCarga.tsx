"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { IconoCamara, IconoSubir } from "./Iconos";

type Props = {
  onArchivos: (archivos: File[]) => void;
  deshabilitado?: boolean;
};

const EXTENSIONES = /\.(jpe?g|png|webp)$/i;

/** Acepta imágenes por tipo MIME o, si el navegador no lo informa, por extensión. */
function esImagen(archivo: File): boolean {
  if (archivo.type) return archivo.type.startsWith("image/");
  return EXTENSIONES.test(archivo.name);
}

const claseBoton =
  "inline-flex items-center gap-2 rounded-md border border-borde bg-superficie-2 px-4 py-2 text-sm font-medium transition-colors hover:border-apagado hover:bg-borde/60 disabled:cursor-not-allowed disabled:opacity-50";

export function ZonaCarga({ onArchivos, deshabilitado = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function recibir(lista: FileList | null) {
    if (!lista) return;
    const todos = Array.from(lista);
    const validos = todos.filter(esImagen);
    const rechazados = todos.length - validos.length;
    setAviso(
      rechazados > 0
        ? `Se omitieron ${rechazados} archivo${rechazados === 1 ? "" : "s"} que no son imágenes (solo JPG, PNG o WEBP).`
        : null,
    );
    if (validos.length > 0) onArchivos(validos);
  }

  function alSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    if (deshabilitado) return;
    recibir(e.dataTransfer.files);
  }

  function alArrastrarSobre(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!deshabilitado) setArrastrando(true);
  }

  function alCambiar(e: ChangeEvent<HTMLInputElement>) {
    recibir(e.target.files);
    // Permite volver a seleccionar el mismo archivo.
    e.target.value = "";
  }

  const claseBorde = arrastrando
    ? "border-acento bg-acento/10"
    : "border-borde bg-superficie hover:border-apagado";

  return (
    <section aria-label="Cargar comprobantes">
      <div
        onDragOver={alArrastrarSobre}
        onDragEnter={alArrastrarSobre}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:py-10 ${claseBorde} ${
          deshabilitado ? "opacity-60" : ""
        }`}
      >
        <IconoSubir className={`h-9 w-9 ${arrastrando ? "text-acento" : "text-apagado"}`} />
        <div>
          <p className="font-medium">Arrastra aquí tus comprobantes</p>
          <p className="mt-1 text-sm text-apagado">
            Imágenes JPG, PNG o WEBP · puedes seleccionar varias a la vez
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={deshabilitado}
            className={claseBoton}
          >
            <IconoSubir className="h-4 w-4" />
            Seleccionar archivos
          </button>
          {/* Solo en móvil: abre la cámara directamente. */}
          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            disabled={deshabilitado}
            className={`${claseBoton} sm:hidden`}
          >
            <IconoCamara />
            Tomar foto
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={alCambiar}
          className="hidden"
          aria-label="Seleccionar imágenes de comprobantes"
        />
        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={alCambiar}
          className="hidden"
          aria-label="Tomar foto de un comprobante"
        />
      </div>

      {aviso && (
        <p role="status" className="mt-2 text-sm text-alerta">
          {aviso}
        </p>
      )}
    </section>
  );
}
