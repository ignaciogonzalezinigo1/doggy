/**
 * Hook para sacar una mascota de "perdidos" cuando aparece.
 *
 * Lo usan el detalle del reporte en Perdidos, el perfil de la mascota, su
 * menú y la edición del reporte, para que la respuesta sea igual en todos los
 * lugares: pide confirmación con el Alert nativo, cierra el reporte en el
 * servidor (PATCH /api/reportes/:id { cerrado: true }) y vibra al terminar.
 * El servidor decide el resultado: si alguien la había encontrado (un
 * reencuentro), cierra también esos avisos y queda "Devuelta a su familia";
 * si no, "Apareció".
 *
 * Háptica: usa el motor de vibración del celular con `expo-haptics` para
 * confirmar que el reporte se cerró (o avisar que falló). No pide permisos.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { ReportePerdida } from '@/types/models';
import { botonCierre, textoResultado } from '@/utils/etiquetas';
import { hallazgoDe } from '@/utils/selectores';

type UseCerrarReporte = {
  /** true mientras se cierra el reporte. */
  cerrando: boolean;
  /**
   * Pide confirmación y cierra el reporte.
   * @param reporte reporte de la mascota que apareció
   */
  pedirCierre: (reporte: ReportePerdida) => void;
};

/**
 * Cierre de un reporte de perdido.
 * @param onCerrado se llama cuando el reporte ya se cerró (por ejemplo, para cerrar la hoja o el modal)
 * @returns el estado de carga y la función para pedir el cierre
 */
export function useCerrarReporte(onCerrado?: (reporte: ReportePerdida) => void): UseCerrarReporte {
  const { reportes, cerrarReporte } = useApp();
  const [cerrando, setCerrando] = useState(false);

  /**
   * Cierra el reporte ya confirmado y avisa cómo salió.
   * @param reporte reporte a cerrar
   */
  const cerrar = useCallback(
    async (reporte: ReportePerdida) => {
      setCerrando(true);
      try {
        const cerrado = await cerrarReporte(reporte.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCerrado?.(reporte);
        const resultado = cerrado.resultado ? ` Quedó como "${textoResultado(cerrado.resultado)}".` : '';
        Alert.alert('¡Qué alegría!', `Sacamos a ${reporte.nombre} del mapa de perdidos.${resultado}`);
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('No se pudo cerrar el reporte', e instanceof Error ? e.message : 'Intentá de nuevo.');
      } finally {
        setCerrando(false);
      }
    },
    [cerrarReporte, onCerrado],
  );

  /**
   * Pide confirmación con el Alert nativo y, si se confirma, cierra el reporte.
   * Si alguien ya la había encontrado, avisa que se cierran los dos reportes.
   * @param reporte reporte de la mascota que apareció
   */
  const pedirCierre = useCallback(
    (reporte: ReportePerdida) => {
      const encontrada = !!hallazgoDe(reportes, reporte);
      Alert.alert(
        encontrada ? `¿Ya recuperaste a ${reporte.nombre}?` : `¿${reporte.nombre} ya apareció?`,
        encontrada
          ? 'Se cierran el reporte de pérdida y los avisos de hallazgo. Salen del mapa y no se pueden volver a abrir.'
          : 'El reporte sale del mapa y deja de verse para los demás. No se puede volver a abrir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: botonCierre(encontrada).texto, onPress: () => cerrar(reporte) },
        ],
      );
    },
    [reportes, cerrar],
  );

  return { cerrando, pedirCierre };
}
