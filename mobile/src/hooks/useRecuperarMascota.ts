/**
 * Hook con las respuestas de la familia a un aviso de mascota encontrada
 * (`AvisoEncontrada`), las mismas en Mis Mascotas, el perfil de la mascota y
 * el detalle del reporte:
 * - "Ya volvió a casa" (reencuentro): cierra un encontrado con un
 *   PATCH /api/reportes/:id { cerrado: true }. El servidor cierra en la misma
 *   operación el perdido y los demás encontrados, todos "Devuelta a su
 *   familia", y salen del mapa.
 * - "Sí, se perdió" (caso dudoso): POST /api/reportes/:id/perdida. El
 *   servidor crea el perdido con el lugar del encontrado y pasa a reencuentro.
 * - "No, está conmigo" (caso dudoso): cierra el encontrado; el servidor lo
 *   guarda como "No se había perdido" y cierra los demás encontrados.
 * El servidor deja hacerlo aunque el encontrado lo haya publicado otra
 * persona, porque el usuario está asignado a la mascota.
 *
 * Háptica: vibra con `expo-haptics` al terminar (o al fallar). No pide permisos.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { ReportePerdida } from '@/types/models';
import { botonCierre } from '@/utils/etiquetas';

/** Textos de los botones del caso dudoso, iguales en el aviso y en las confirmaciones. */
export const TEXTO_SE_PERDIO = 'Sí, se perdió';
export const TEXTO_ESTA_CONMIGO = 'No, está conmigo';

type UseRecuperarMascota = {
  /** true mientras se responde el aviso. */
  recuperando: boolean;
  /**
   * "Ya volvió a casa": pide confirmación y cierra el reencuentro.
   * @param encontrado un encontrado activo de la mascota
   */
  pedirRecuperacion: (encontrado: ReportePerdida) => void;
  /**
   * "Sí, se perdió": crea el perdido con el lugar del encontrado.
   * @param encontrado el encontrado del caso dudoso
   */
  confirmarPerdida: (encontrado: ReportePerdida) => void;
  /**
   * "No, está conmigo": pide confirmación y cierra el aviso.
   * @param encontrado el encontrado del caso dudoso
   */
  pedirDescarte: (encontrado: ReportePerdida) => void;
};

/**
 * Respuestas de la familia a un aviso de mascota encontrada.
 * @param onListo se llama cuando una respuesta salió bien (por ejemplo, para cerrar la hoja de detalle)
 * @returns el estado de carga y las tres acciones
 */
export function useRecuperarMascota(onListo?: () => void): UseRecuperarMascota {
  const { cerrarReporte, confirmarPerdida: crearPerdido } = useApp();
  const [recuperando, setRecuperando] = useState(false);

  /**
   * Corre una acción con el estado de carga, la vibración y el aviso final.
   * @param accion pedido al servidor
   * @param exito título y mensaje si salió bien
   * @param error título si falló
   */
  const responder = useCallback(
    async (accion: () => Promise<unknown>, exito: [string, string], error: string) => {
      setRecuperando(true);
      try {
        await accion();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onListo?.();
        Alert.alert(...exito);
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(error, e instanceof Error ? e.message : 'Intentá de nuevo.');
      } finally {
        setRecuperando(false);
      }
    },
    [onListo],
  );

  /**
   * Pide confirmación y cierra el reencuentro ("Ya volvió a casa").
   * @param encontrado un encontrado activo de la mascota
   */
  const pedirRecuperacion = useCallback(
    (encontrado: ReportePerdida) => {
      Alert.alert(
        `¿${encontrado.nombre} ya volvió a casa?`,
        'Se cierran el reporte de pérdida y los avisos de quienes avisaron el hallazgo. Salen del mapa y no se pueden volver a abrir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: botonCierre(true).texto,
            onPress: () =>
              responder(
                () => cerrarReporte(encontrado.id),
                ['¡Qué alegría!', `${encontrado.nombre} ya está en casa y salió del mapa de perdidos.`],
                'No se pudo cerrar el reporte',
              ),
          },
        ],
      );
    },
    [cerrarReporte, responder],
  );

  /**
   * "Sí, se perdió": publica el perdido sin pedir confirmación, porque se puede
   * cerrar después con "Ya volvió a casa".
   * @param encontrado el encontrado del caso dudoso
   */
  const confirmarPerdida = useCallback(
    (encontrado: ReportePerdida) => {
      responder(
        () => crearPerdido(encontrado.id),
        [
          'Publicamos el reporte de pérdida',
          `${encontrado.nombre} figura en Perdidos en el lugar del hallazgo. Coordiná con quien avisó para que vuelva a casa.`,
        ],
        'No se pudo publicar el reporte',
      );
    },
    [crearPerdido, responder],
  );

  /**
   * Pide confirmación y cierra el aviso ("No, está conmigo").
   * @param encontrado el encontrado del caso dudoso
   */
  const pedirDescarte = useCallback(
    (encontrado: ReportePerdida) => {
      Alert.alert(
        `¿${encontrado.nombre} está con vos?`,
        'Se cierra el aviso de hallazgo y sale del mapa. No se puede volver a abrir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: TEXTO_ESTA_CONMIGO,
            onPress: () =>
              responder(
                () => cerrarReporte(encontrado.id),
                ['Listo', `Cerramos el aviso: ${encontrado.nombre} está en casa.`],
                'No se pudo cerrar el aviso',
              ),
          },
        ],
      );
    },
    [cerrarReporte, responder],
  );

  return { recuperando, pedirRecuperacion, confirmarPerdida, pedirDescarte };
}
