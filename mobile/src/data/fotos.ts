/**
 * Cómo se muestra la foto guardada en un modelo.
 *
 * Los modelos guardan la foto como string: la ruta de una foto del servidor
 * ("/uploads/abc.jpg", también las de los datos de la demo, que el seed de
 * doggy-backend copia a su carpeta de uploads) o, mientras se edita un
 * formulario, la URI local de la foto recién elegida. `fuenteFoto` resuelve
 * los dos casos al formato que espera el componente Image. La app no trae
 * fotos de datos empaquetadas: todas salen del servidor.
 *
 * El servidor guarda la ruta relativa y no la URL completa porque la IP de la
 * PC cambia: la URL se arma acá con `API_URL`.
 */

import { API_URL } from '@/config';

/** Prefijo de las fotos del servidor. */
const PREFIJO_UPLOADS = '/uploads/';

/** Fuente de una imagen: una URI. La aceptan el `Image` de React Native y el de expo-image. */
export type FuenteFoto = { uri: string };

/**
 * Convierte el valor guardado en un modelo en una fuente para Image.
 * @param foto ruta "/uploads/...", URI local o null
 * @returns la fuente de la imagen, o null si no hay foto
 */
export function fuenteFoto(foto: string | null | undefined): FuenteFoto | null {
  if (!foto) return null;
  if (foto.startsWith(PREFIJO_UPLOADS)) return { uri: `${API_URL}${foto}` };
  return { uri: foto };
}
