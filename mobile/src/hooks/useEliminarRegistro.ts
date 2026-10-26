/**
 * Hook con lo que hace "Eliminar" en una card del carnet (la del historial y
 * la del próximo refuerzo): pide confirmación y borra el registro; si se
 * cancela o falla, la card vuelve a su lugar.
 */
import { useCallback } from 'react';

import { useApp } from '@/context/AppContext';
import type { RegistroSanitario } from '@/types/models';
import { formatearFecha } from '@/utils/fechas';
import { useConfirmarBorrado } from './useConfirmarBorrado';

/**
 * Acción de eliminar un registro desde su card deslizable.
 * @param registro registro de la card
 * @returns el `onEliminar` para `DeslizarParaBorrar`
 */
export function useEliminarRegistro(registro: RegistroSanitario): (cerrar: () => void) => void {
  const { borrarRegistro } = useApp();
  const { pedirBorrado } = useConfirmarBorrado();

  return useCallback(
    (cerrar: () => void) => {
      pedirBorrado({
        titulo: `¿Eliminar ${registro.nombre}?`,
        mensaje: `Se borra la aplicación del ${formatearFecha(registro.fecha)} del carnet. No se puede deshacer.`,
        borrar: () => borrarRegistro(registro.id),
        onDescartado: cerrar,
      });
    },
    [borrarRegistro, pedirBorrado, registro],
  );
}
