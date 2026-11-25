/**
 * Constantes y helpers del mapa.
 */
import type { Coordenadas } from '@/hooks/useUbicacion';

/** Región del mapa, con el mismo formato que usa react-native-maps. */
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Centro aproximado de CABA (Obelisco). Es la vista por defecto sin GPS. */
export const CENTRO_CABA: Coordenadas = { lat: -34.6037, lng: -58.3816 };

/** Zoom que muestra casi toda la ciudad. */
export const DELTA_CIUDAD = 0.14;
/** Zoom de barrio, para centrarse en un reporte o en el usuario. */
export const DELTA_BARRIO = 0.02;

/**
 * Hasta qué distancia del usuario se muestran los reportes de Perdidos, en
 * metros: 10 km. Lo aplica el servidor (`RADIO_PERDIDOS_METROS` de
 * doggy-backend/src/dominio.ts, tiene que ser el mismo); acá es para el texto
 * de la pantalla. Un perro perdido se mueve varios kilómetros, así que deja
 * margen de sobra sobre el radio más grande que elige la familia (2 km) y
 * cubre el barrio y los de alrededor sin traer reportes de otra ciudad.
 */
export const RADIO_PERDIDOS_METROS = 10_000;

/** Radios de búsqueda que puede elegir el tutor, en metros. */
export const RADIOS_BUSQUEDA = [200, 500, 1000, 2000] as const;
/** Radio que viene elegido por defecto. */
export const RADIO_POR_DEFECTO = 500;

/** Metros que hay en un grado de latitud (aproximado, alcanza para el zoom). */
const METROS_POR_GRADO = 111_320;
/** Margen para que el círculo entre entero en el mapa, con aire alrededor. */
const MARGEN_CIRCULO = 1.6;
/** Zoom máximo al mostrar un radio chico. */
const DELTA_MINIMO = 0.006;

/**
 * Texto de un radio: "500 m" o "2 km".
 * @param metros radio en metros
 * @returns el radio listo para mostrar
 */
export function textoRadio(metros: number): string {
  return metros >= 1000 ? `${metros / 1000} km` : `${metros} m`;
}

/**
 * Zoom para que un círculo de ese radio entre completo en el mapa.
 * @param metros radio en metros
 * @returns delta en grados para `regionAlrededor`
 */
export function deltaParaRadio(metros: number): number {
  return Math.max(DELTA_MINIMO, (metros * 2 * MARGEN_CIRCULO) / METROS_POR_GRADO);
}

/**
 * Arma una región centrada en unas coordenadas.
 * @param coords centro
 * @param delta amplitud en grados (más chico = más zoom)
 * @returns la región para el mapa
 */
export function regionAlrededor(coords: Coordenadas, delta: number = DELTA_BARRIO): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}
