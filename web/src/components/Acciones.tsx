import { Spinner } from "./Iconos";

type Props = {
  procesando: boolean;
  deteniendo: boolean;
  hayPendientes: boolean;
  hayAlgo: boolean;
  onProcesar: () => void;
  onDetener: () => void;
  onLimpiar: () => void;
};

const claseBase =
  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-6 text-base font-bold uppercase tracking-wider shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:flex-none sm:min-w-56";

/** Botones principales: PROCESAR (o DETENER mientras corre) y Limpiar. */
export function Acciones({
  procesando,
  deteniendo,
  hayPendientes,
  hayAlgo,
  onProcesar,
  onDetener,
  onLimpiar,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {procesando ? (
        <button
          type="button"
          onClick={onDetener}
          disabled={deteniendo}
          title="Termina la imagen actual y deja las demás pendientes"
          className={`${claseBase} bg-alerta text-black shadow-alerta/20 hover:bg-amber-400`}
        >
          <Spinner className="h-5 w-5" />
          {deteniendo ? "Deteniendo…" : "Detener"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onProcesar}
          disabled={!hayPendientes}
          className={`${claseBase} bg-acento text-white shadow-acento/20 hover:bg-acento-hover`}
        >
          Procesar
        </button>
      )}
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
