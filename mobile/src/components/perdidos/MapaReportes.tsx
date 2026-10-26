/**
 * Mapa de reportes (versión nativa, con react-native-maps).
 *
 * Usa el mapa del sistema (Apple Maps en iOS, Google Maps en Android, ambos
 * disponibles en Expo Go). Arranca mostrando CABA y expone `centrar` por ref
 * para que la pantalla mueva la cámara al tocar una card o "mi ubicación".
 * Si el reporte seleccionado tiene radio de búsqueda (mascota propia
 * perdida), se dibuja el círculo de la zona donde se la vio por última vez.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import { colors } from '@/theme';
import { CENTRO_CABA, DELTA_BARRIO, DELTA_CIUDAD, regionAlrededor } from '@/utils/mapa';
import type { MapaReportesHandle, MapaReportesProps } from './MapaReportes.types';
import { ReporteMarker } from './ReporteMarker';

export type { MapaReportesHandle } from './MapaReportes.types';

/** Duración de la animación de cámara, en ms. */
const ANIMACION_MS = 500;

/**
 * Mapa con un marker por reporte (un solo pin por mascota: la pantalla ya
 * saca los encontrados que representa su perdido).
 * @param props reportes, hallazgos, selección, callback y si se muestra al usuario
 * @returns el MapView
 */
export const MapaReportes = forwardRef<MapaReportesHandle, MapaReportesProps>(
  function MapaReportes({ reportes, hallazgos, onSeleccionar, seleccionadoId, mostrarUsuario, style }, ref) {
    const mapaRef = useRef<MapView>(null);
    // Solo el seleccionado muestra su círculo, para no tapar el mapa con zonas.
    const seleccionado = reportes.find((r) => r.id === seleccionadoId);

    useImperativeHandle(ref, () => ({
      centrar: (coords, delta = DELTA_BARRIO) => {
        mapaRef.current?.animateToRegion(regionAlrededor(coords, delta), ANIMACION_MS);
      },
    }));

    return (
      <MapView
        ref={mapaRef}
        style={[styles.mapa, style]}
        initialRegion={regionAlrededor(CENTRO_CABA, DELTA_CIUDAD)}
        showsUserLocation={mostrarUsuario}
        // El botón propio de "mi ubicación" reemplaza al del sistema.
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        {seleccionado?.radioMetros ? (
          <Circle
            center={{ latitude: seleccionado.lat, longitude: seleccionado.lng }}
            radius={seleccionado.radioMetros}
            fillColor={colors.mustard20}
            strokeColor={colors.mustard80}
            strokeWidth={2}
          />
        ) : null}
        {reportes.map((reporte) => (
          <ReporteMarker
            key={reporte.id}
            reporte={reporte}
            seleccionado={reporte.id === seleccionadoId}
            encontrada={hallazgos.has(reporte.id)}
            onPress={onSeleccionar}
          />
        ))}
      </MapView>
    );
  },
);

// --- Estilos ---
const styles = StyleSheet.create({
  mapa: {
    flex: 1,
  },
});
