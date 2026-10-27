/**
 * Mensajes que la app deja escritos en WhatsApp para la familia de una
 * mascota perdida. Cada mensaje se arma en una sola función, así el texto es
 * el mismo en todos los lugares que lo usan. Si no hay ubicación, se omite la
 * parte del mapa y el resto queda igual.
 */
import { enlaceMapa } from './enlaces';

/** Datos para armar un mensaje a la familia. */
type DatosMensaje = {
  /** Nombre de quien recibe el mensaje (la familia de la mascota). */
  dueno: string;
  /** Nombre de quien escribe (el usuario logueado). */
  yo: string;
  /** Nombre de la mascota. */
  mascota: string;
  /** Dónde está quien escribe, o null si no se pudo saber. */
  punto: { lat: number; lng: number } | null;
};

/**
 * Mensaje de quien escaneó la chapita y tiene a la mascota con él.
 * @param datos ver `DatosMensaje`
 * @returns el texto para WhatsApp
 */
export function mensajeLaTengo({ dueno, yo, mascota, punto }: DatosMensaje): string {
  const donde = punto ? ` Estoy acá: ${enlaceMapa(punto)}.` : '';
  return (
    `¡Hola ${dueno}! Soy ${yo}. Encontré a ${mascota} gracias a su chapita de Doggy y está conmigo.` +
    `${donde} ¿Cómo coordinamos para que la busques?`
  );
}

/**
 * Mensaje de quien vio el aviso en Perdidos y cree que la vio (no la tiene).
 * @param datos ver `DatosMensaje`
 * @returns el texto para WhatsApp
 */
export function mensajeLaVi({ dueno, yo, mascota, punto }: DatosMensaje): string {
  const donde = punto ? ` y creo que la vi cerca de ${enlaceMapa(punto)}` : '';
  return `¡Hola ${dueno}! Soy ${yo}. Vi en Doggy el aviso de ${mascota}${donde}. ¿Te puedo ayudar en algo?`;
}
