/**
 * Tipos compartidos por las versiones nativa y web del mapa de reportes.
 */
import type { StyleProp, ViewStyle } from 'react-native';

import type { Coordenadas } from '@/hooks/useUbicacion';
import type { ReportePerdida } from '@/types/models';
import type { Reencuentro } from '@/utils/selectores';

/** Lo que el mapa expone por ref a la pantalla. */
export type MapaReportesHandle = {
  /** Mueve la cámara con animación hasta esas coordenadas. */
  centrar: (coords: Coordenadas, delta?: number) => void;
};

export type MapaReportesProps = {
  reportes: ReportePerdida[];
  /** Reencuentros, por id del reporte que los representa (`reencuentrosPorReporte`): su pin es verde con un tilde. */
  reencuentros: ReadonlyMap<number, Reencuentro>;
  onSeleccionar: (reporte: ReportePerdida) => void;
  seleccionadoId?: number | null;
  /** Muestra el punto azul del usuario (solo si hay permiso). */
  mostrarUsuario: boolean;
  style?: StyleProp<ViewStyle>;
};
