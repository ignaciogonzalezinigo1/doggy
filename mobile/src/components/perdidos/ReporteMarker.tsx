/**
 * Marker del mapa para un reporte: pin mostaza si está perdido, teal si fue
 * encontrado. Un reencuentro (perdido y encontrado de la misma mascota) es un
 * solo pin verde con un tilde, en el lugar del encontrado. El pin
 * seleccionado se dibuja un poco más grande.
 *
 * Rendimiento: un Marker con vista propia que tiene `tracksViewChanges` en
 * true se vuelve a dibujar en cada cuadro y traba el mapa. Acá está prendido
 * solo un momento al montar y al cambiar cómo se ve el pin, y después se
 * apaga. Además va con `memo`, con la coordenada y el `onPress` estables: si
 * el reporte, la selección y la marca no cambian, el marker no se toca.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { TEXTO_REENCUENTRO } from '@/utils/etiquetas';

type Props = {
  reporte: ReportePerdida;
  seleccionado: boolean;
  /** true si el reporte representa un reencuentro (ver `reencuentrosPorReporte`). */
  reencuentro?: boolean;
  onPress: (reporte: ReportePerdida) => void;
};

/** Tamaño del pin normal y seleccionado. */
const PIN = 40;
const PIN_SELECCIONADO = 52;
/** Tiempo que el marker sigue redibujándose al cambiar, para que llegue a pintarse el ícono. */
const REDIBUJO_MS = 600;

/**
 * Marker personalizado.
 * @param props ver `Props`
 * @returns el marker
 */
function ReporteMarkerBase({ reporte, seleccionado, reencuentro = false, onPress }: Props) {
  // En Android un marker con vista propia se "congela" como imagen. Se deja que
  // siga actualizándose un momento después de cada cambio y después se apaga
  // (tracksViewChanges siempre en true consume mucha batería con varios pines).
  const [redibujar, setRedibujar] = useState(true);
  // Cómo se veía el pin en el render anterior, para detectar el cambio sin un efecto.
  const vista = `${seleccionado}|${reencuentro}`;
  const [vistaPrevia, setVistaPrevia] = useState(vista);
  if (vista !== vistaPrevia) {
    setVistaPrevia(vista);
    setRedibujar(true);
  }

  // Después de cada cambio (y al montar), se apaga el redibujado pasado un momento.
  useEffect(() => {
    const timer = setTimeout(() => setRedibujar(false), REDIBUJO_MS);
    return () => clearTimeout(timer);
  }, [vista]);

  const coordenada = useMemo(
    () => ({ latitude: reporte.lat, longitude: reporte.lng }),
    [reporte.lat, reporte.lng],
  );
  const handlePress = useCallback(() => onPress(reporte), [onPress, reporte]);

  // El reencuentro va en verde con el tilde; si no, mostaza el perdido y teal el encontrado.
  const color = reencuentro
    ? colors.verde
    : reporte.estado === 'perdido'
      ? colors.mustard
      : colors.primaryContainer;

  return (
    <Marker
      coordinate={coordenada}
      onPress={handlePress}
      tracksViewChanges={redibujar}
      anchor={{ x: 0.5, y: 1 }}
      title={reporte.nombre}
      description={reencuentro ? `${reporte.zona} · ${TEXTO_REENCUENTRO}` : reporte.zona}
    >
      <View style={styles.pin}>
        <MaterialIcons
          name={reencuentro ? 'where-to-vote' : 'location-on'}
          size={seleccionado ? PIN_SELECCIONADO : PIN}
          color={color}
        />
      </View>
    </Marker>
  );
}

/** Memoizado: solo se vuelve a dibujar si cambian sus props. */
export const ReporteMarker = memo(ReporteMarkerBase);

// --- Estilos ---
const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
