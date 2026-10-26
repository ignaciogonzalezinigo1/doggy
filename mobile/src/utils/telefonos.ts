/**
 * Teléfonos con libphonenumber-js, igual que en doggy-backend.
 *
 * El servidor guarda los teléfonos en E.164 (+5491145892310). Para mostrarlos
 * se usa el formato internacional legible (+54 9 11 4589-2310) y los links
 * `tel:` usan E.164. Sin código de país se toma la Argentina. Se usa la
 * metadata completa (`/max`), la misma que el servidor, así la app y la API
 * aceptan exactamente los mismos números.
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

/** País que se asume cuando el número no trae código de país. */
const REGION_TELEFONO = 'AR';

/**
 * Convierte un teléfono escrito en cualquier formato habitual a E.164.
 * @param texto teléfono como lo escribió el usuario
 * @returns el número en E.164, o null si no es un número válido
 */
export function aE164(texto: string): string | null {
  const numero = parsePhoneNumberFromString(texto.trim(), REGION_TELEFONO);
  return numero?.isValid() ? numero.number : null;
}

/**
 * Teléfono para mostrar: formato internacional con el último grupo unido por
 * un guion ("+54 9 11 4589-2310"). Si no se puede interpretar, queda como está.
 * @param telefono teléfono guardado (en E.164 o como se cargó antes)
 * @returns el teléfono listo para mostrar
 */
export function formatearTelefono(telefono: string): string {
  const numero = parsePhoneNumberFromString(telefono.trim(), REGION_TELEFONO);
  if (!numero?.isValid()) return telefono;
  return numero.formatInternational().replace(/ (\d+)$/, '-$1');
}

/**
 * Link para llamar (`tel:` con el número en E.164).
 * @param telefono teléfono guardado
 * @returns la URL `tel:`
 */
export function enlaceTelefono(telefono: string): string {
  return `tel:${aE164(telefono) ?? telefono.replace(/[^\d+]/g, '')}`;
}
