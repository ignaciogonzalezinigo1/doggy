/**
 * Mensajes que la app deja escritos en WhatsApp entre la familia de una
 * mascota y quien la encontró o la vio. Cada mensaje se arma en una sola
 * función, así el texto es el mismo en todos los lugares que lo usan.
 *
 * Van sin ubicación (ni link de Google Maps ni "Estoy acá"), con el primer
 * nombre de cada persona. Si falta un dato, se arma sin esa parte: nunca
 * quedan llaves, "undefined" ni espacios de más.
 */

/** Datos para armar un mensaje. Cualquiera puede faltar. */
type DatosMensaje = {
  /** Nombre de quien recibe el mensaje. */
  para?: string | null;
  /** Nombre de quien escribe (el usuario logueado). */
  yo?: string | null;
  /** Nombre de la mascota. */
  mascota?: string | null;
};

/**
 * Primer nombre de una persona ("Juan Pablo" → "Juan").
 * @param nombre nombre completo o vacío
 * @returns el primer nombre, o "" si no hay
 */
function primerNombre(nombre: string | null | undefined): string {
  return nombre?.trim().split(/\s+/)[0] ?? '';
}

/**
 * Saludo y presentación: "¡Hola Ana! Soy Juan" (sin el punto final).
 * @param para a quién se le escribe
 * @param yo quién escribe
 * @returns el comienzo del mensaje
 */
function saludo(para: string, yo: string): string {
  return `¡Hola${para ? ` ${para}` : ''}!${yo ? ` Soy ${yo}` : ''}`;
}

/**
 * Mensaje de la familia a quien encontró a la mascota (aviso "¡Encontraron a …!").
 * @param datos `para`: quien la encontró; `yo`: alguien de la familia
 * @returns el texto para WhatsApp
 */
export function mensajeGracias({ para, yo, mascota }: DatosMensaje): string {
  const nombre = primerNombre(yo);
  const perro = mascota?.trim() ?? '';
  const presentacion = nombre && perro ? `, de la familia de ${perro}.` : nombre ? '.' : '';
  return (
    `${saludo(primerNombre(para), nombre)}${presentacion} Vi tu aviso en Doggy, ` +
    `¡muchas gracias${perro ? ` por encontrar a ${perro}` : ''}! ¿Cómo coordinamos para que vuelva a casa?`
  );
}

/**
 * Mensaje de quien escaneó la chapita y tiene a la mascota con él.
 * @param datos `para`: la familia; `yo`: quien la encontró
 * @returns el texto para WhatsApp
 */
export function mensajeLaTengo({ para, yo, mascota }: DatosMensaje): string {
  const nombre = primerNombre(yo);
  const perro = mascota?.trim() ?? '';
  const hallazgo = perro
    ? `Encontré a ${perro} gracias a su chapita de Doggy y está conmigo.`
    : 'Encontré a tu mascota gracias a su chapita de Doggy y está conmigo.';
  return `${saludo(primerNombre(para), nombre)}${nombre ? '.' : ''} ${hallazgo} ¿Cómo coordinamos para que vuelva a casa?`;
}

/**
 * Mensaje de quien vio el aviso en Perdidos y cree que vio a la mascota (no la tiene).
 * @param datos `para`: la familia; `yo`: quien la vio
 * @returns el texto para WhatsApp
 */
export function mensajeLaVi({ para, yo, mascota }: DatosMensaje): string {
  const nombre = primerNombre(yo);
  const perro = mascota?.trim() ?? '';
  const aviso = perro ? `Vi en Doggy el aviso de ${perro} y creo que vi a ${perro}.` : 'Vi tu aviso en Doggy.';
  return `${saludo(primerNombre(para), nombre)}${nombre ? '.' : ''} ${aviso} ¿Te puedo ayudar en algo?`;
}
