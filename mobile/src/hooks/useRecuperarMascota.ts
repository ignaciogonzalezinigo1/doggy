/**
 * Hook para "Ya volvió a casa": la familia ya tiene de vuelta a una mascota que
 * alguien reportó como encontrada.
 *
 * Pide confirmación con el Alert nativo y cierra el reporte "encontrado" con
 * un PATCH /api/reportes/:id { cerrado: true }. El servidor lo cierra como
 * "Devuelta a su familia" y, en la misma operación, cierra también el
 * "perdido" activo de la mascota, si hay: así deja de figurar en el mapa por
 * los dos lados. Lo deja cerrar aunque lo haya publicado otra persona,
 * porque el usuario está asignado a la mascota.
 *
 * Háptica: vibra con `expo-haptics` al terminar (o al fallar). No pide permisos.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { ReportePerdida } from '@/types/models';

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
  const { cerrarReporte } = useApp();
  const [recuperando, setRecuperando] = useState(false);

  /**
   * Cierra el "encontrado"; el servidor cierra con él el "perdido" activo, si hay.
   * @param encontrado reporte "encontrado" de la mascota
   */
  const recuperar = useCallback(
    async (encontrado: ReportePerdida) => {
      setRecuperando(true);
      try {
        await cerrarReporte(encontrado.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Qué alegría!', `${encontrado.nombre} ya está en casa y salió del mapa de perdidos.`);
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('No se pudo cerrar el reporte', e instanceof Error ? e.message : 'Intentá de nuevo.');
      } finally {
        setRecuperando(false);
      }
    },
    [cerrarReporte],
  );

  /**
   * Pide confirmación con el Alert nativo y, si se confirma, cierra los reportes.
   * @param encontrado reporte "encontrado" de la mascota
   */
  const pedirRecuperacion = useCallback(
    (encontrado: ReportePerdida) => {
      Alert.alert(
        `¿Ya recuperaste a ${encontrado.nombre}?`,
        'Se cierra el aviso de hallazgo y, si había un reporte de pérdida, también ese. Los dos salen del mapa y no se pueden volver a abrir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ya volvió a casa', onPress: () => recuperar(encontrado) },
        ],
      );
    },
    [recuperar],
  );

  return { recuperando, pedirRecuperacion };
}
