/**
 * Fotos incluidas en la app para los datos de ejemplo.
 *
 * Los modelos guardan la foto como string: puede ser una de estas claves
 * (foto local empaquetada, la usan los datos del seed), una ruta de una foto
 * subida al servidor ("/uploads/abc.jpg") o, mientras se edita un formulario,
 * la URI local de la foto recién elegida. `fuenteFoto` resuelve cualquiera de
 * los casos al formato que espera el componente Image.
 *
 * El servidor guarda la ruta relativa y no la URL completa porque la IP de la
 * PC cambia: la URL se arma acá con `API_URL`.
 */
import type { ImageSourcePropType } from 'react-native';

import { API_URL } from '@/config';

/** Prefijo de las fotos subidas al servidor. */
const PREFIJO_UPLOADS = '/uploads/';

/** Fotos de los datos del seed (créditos en CREDITOS.md, en la raíz del repo). */
const FOTOS_LOCALES = {
  luna: require('@/assets/images/luna.jpg'),
  roco: require('@/assets/images/roco.jpg'),
  milo: require('@/assets/images/milo.jpg'),
  toby: require('@/assets/images/toby.jpg'),
  pipa: require('@/assets/images/pipa.jpg'),
  simba: require('@/assets/images/simba.jpg'),
  'sin-collar': require('@/assets/images/sin-collar.jpg'),
  nieve: require('@/assets/images/nieve.jpg'),
  caniche: require('@/assets/images/caniche.jpg'),
  rocky: require('@/assets/images/rocky.jpg'),
  labrador: require('@/assets/images/labrador.jpg'),
  salchicha: require('@/assets/images/salchicha.jpg'),
  sofia: require('@/assets/images/sofia.jpg'),
  carlos: require('@/assets/images/carlos.jpg'),
  martin: require('@/assets/images/martin.jpg'),
  valentina: require('@/assets/images/valentina.jpg'),
  julian: require('@/assets/images/julian.jpg'),
  marcos: require('@/assets/images/marcos.jpg'),
  sol: require('@/assets/images/sol.jpg'),
  lucia: require('@/assets/images/lucia.jpg'),
  'vet-san-roque': require('@/assets/images/vet-san-roque.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export type ClaveFotoLocal = keyof typeof FOTOS_LOCALES;

/**
 * Convierte el valor guardado en un modelo en una fuente para Image.
 * @param foto clave local, ruta "/uploads/...", URI local o null
 * @returns la fuente de la imagen, o null si no hay foto
 */
export function fuenteFoto(foto: string | null | undefined): ImageSourcePropType | null {
  if (!foto) return null;
  if (foto in FOTOS_LOCALES) return FOTOS_LOCALES[foto as ClaveFotoLocal];
  if (foto.startsWith(PREFIJO_UPLOADS)) return { uri: `${API_URL}${foto}` };
  return { uri: foto };
}
