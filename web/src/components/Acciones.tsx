import { Spinner } from "./Iconos";

type Props = {
  procesando: boolean;
  hayPendientes: boolean;
  hayAlgo: boolean;
  onProcesar: () => void;
  onLimpiar: () => void;
};

/** Botones principales: PROCESAR y Limpiar. */
export function Acciones({ procesando, hayPendientes, hayAlgo, onProcesar, onLimpiar }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onProcesar}
        disabled={procesando || !hayPendientes}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-acento px-6 text-base font-bold uppercase tracking-wider text-white shadow-lg shadow-acento/20 transition-colors hover:bg-acento-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:flex-none sm:min-w-56"
      >
        {procesando && <Spinner className="h-5 w-5" />}
        {procesando ? "Procesando…" : "Procesar"}
      </button>
      <button
        type="button"
        onClick={onLimpiar}
        disabled={procesando || !hayAlgo}
        className="inline-flex h-12 items-center justify-center rounded-lg border border-borde bg-superficie px-5 text-sm font-medium text-texto transition-colors hover:border-apagado hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Limpiar
      </button>
      {!hayPendientes && !procesando && (
        <p className="text-sm text-apagado sm:ml-auto">Agrega imágenes para habilitar el procesamiento.</p>
      )}
    </div>
  );
}
