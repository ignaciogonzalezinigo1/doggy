/**
 * Hook para "Ya la recuperé": la familia ya tiene de vuelta a una mascota que
 * alguien reportó como encontrada.
 *
 * Pide confirmación con el Alert nativo y cierra el reporte "encontrado" y,
 * si la mascota también estaba reportada como perdida, ese reporte. Así deja
 * de figurar en el mapa por los dos lados. Cada cierre es un
 * PATCH /api/reportes/:id { cerrado: true }: el servidor deja cerrar el
 * "encontrado" aunque lo haya publicado otra persona, porque el usuario está
 * asignado a la mascota.
 *
 * Háptica: vibra con `expo-haptics` al terminar (o al fallar). No pide permisos.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { ReportePerdida } from '@/types/models';
import { reporteActivo } from '@/utils/selectores';

type UseRecuperarMascota = {
  /** true mientras se cierran los reportes. */
  recuperando: boolean;
  /**
   * Pide confirmación y cierra los reportes de la mascota.
   * @param encontrado reporte "encontrado" de la mascota
   */
  pedirRecuperacion: (encontrado: ReportePerdida) => void;
};

/**
 * Cierre de los reportes de una mascota que ya volvió a casa.
 * @returns el estado de carga y la función para pedir la confirmación
 */
export function useRecuperarMascota(): UseRecuperarMascota {
  const { reportes, cerrarReporte } = useApp();
  const [recuperando, setRecuperando] = useState(false);

  /**
   * Cierra el "encontrado" y el "perdido" activo, si hay.
   * @param encontrado reporte "encontrado" de la mascota
   */
  const recuperar = useCallback(
    async (encontrado: ReportePerdida) => {
      const perdido =
        encontrado.mascotaId !== null ? reporteActivo(reportes, encontrado.mascotaId) : undefined;
      setRecuperando(true);
      try {
        await cerrarReporte(encontrado.id);
        if (perdido) await cerrarReporte(perdido.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Qué alegría!', `${encontrado.nombre} ya está en casa y salió del mapa de perdidos.`);
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('No se pudo cerrar el reporte', e instanceof Error ? e.message : 'Intentá de nuevo.');
      } finally {
        setRecuperando(false);
      }
    },
    [reportes, cerrarReporte],
  );

  /**
   * Pide confirmación con el Alert nativo y, si se confirma, cierra los reportes.
   * @param encontrado reporte "encontrado" de la mascota
   */
  const pedirRecuperacion = useCallback(
    (encontrado: ReportePerdida) => {
      Alert.alert(
        `¿Ya recuperaste a ${encontrado.nombre}?`,
        'Se cierra el aviso de que la encontraron y, si estaba reportada como perdida, también ese reporte. Los dos salen del mapa y no se pueden volver a abrir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ya la recuperé', onPress: () => recuperar(encontrado) },
        ],
      );
    },
    [recuperar],
  );

  return { recuperando, pedirRecuperacion };
}
