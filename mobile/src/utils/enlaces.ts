/**
 * Links que abre la app para comunicarse: llamar (`tel:`), WhatsApp (wa.me) y
 * un punto en Google Maps para mandar en un mensaje.
 *
 * Los teléfonos llegan del servidor ya en E.164 ("+5491145892310"), así que
 * se usan tal cual: no se vuelven a pasar por `aE164`, que tomaría un fijo
 * como celular. La regla para leerlos y mostrarlos está en `telefonos.ts`.
 */

/**
 * Link para llamar (`tel:` con el número en E.164).
 * @param telefono teléfono guardado
 * @returns la URL `tel:`
 */
export function enlaceTelefono(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`;
}

/**
 * Link de WhatsApp con un mensaje ya escrito: https://wa.me/<número sin +>?text=<texto>.
 * Es la única función que lo arma.
 * @param telefono teléfono en E.164 ("+5491145892310")
 * @param texto mensaje a precargar
 * @returns la URL de wa.me
 */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  const numero = telefono.replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/**
 * Link de Google Maps a un punto, para mandarlo en un mensaje.
 * @param punto latitud y longitud
 * @returns la URL de Google Maps
 */
export function enlaceMapa(punto: { lat: number; lng: number }): string {
  return `https://maps.google.com/?q=${punto.lat},${punto.lng}`;
}
