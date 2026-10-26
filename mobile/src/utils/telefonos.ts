/**
 * Teléfonos con libphonenumber-js, con la misma regla que doggy-backend.
 *
 * El servidor guarda los teléfonos en E.164 (+5492994554060). Para mostrarlos
 * se usa el formato internacional legible (+54 9 299 455-4060) y los links
 * `tel:` y de WhatsApp usan E.164. Sin código de país se toma la Argentina. Se
 * usa la metadata completa (`/max`), la misma que el servidor, así la app y
 * la API aceptan exactamente los mismos números.
 *
 * Regla argentina: por defecto todo número es CELULAR ("2994554060",
 * "299 455-4060" y "0299 15 455-4060" dan +5492994554060). Para un fijo, el
 * usuario marca "Es un teléfono fijo" y se guarda sin el 9.
 */
import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js/max';

/** País que se asume cuando el número no trae código de país. */
const REGION_TELEFONO = 'AR';
/** Código de país de la Argentina. */
const CODIGO_ARGENTINA = '54';

/**
 * Interpreta un número E.164 y lo devuelve solo si es válido.
 * @param e164 número con +
 * @returns el número, o null si no es válido
 */
function siEsValido(e164: string): PhoneNumber | null {
  const numero = parsePhoneNumberFromString(e164);
  return numero?.isValid() ? numero : null;
}

/**
 * Convierte un teléfono escrito en cualquier formato habitual a E.164, con la
 * regla argentina: celular por defecto, fijo solo si se marcó.
 * @param texto teléfono como lo escribió el usuario
 * @param fijo true si el usuario marcó "Es un teléfono fijo"
 * @returns el número en E.164, o null si no es un número válido
 */
export function aE164(texto: string, fijo = false): string | null {
  const numero = parsePhoneNumberFromString(texto.trim(), REGION_TELEFONO);
  if (!numero?.isValid()) return null;
  if (numero.countryCallingCode !== CODIGO_ARGENTINA) return numero.number;

  const nacional = numero.nationalNumber;
  const esMovil = numero.getType() === 'MOBILE';
  if (fijo && esMovil) {
    // El celular argentino es el fijo con un 9 adelante: se le saca.
    return siEsValido(`+${CODIGO_ARGENTINA}${nacional.replace(/^9/, '')}`)?.number ?? numero.number;
  }
  if (!fijo && !esMovil) {
    return siEsValido(`+${CODIGO_ARGENTINA}9${nacional}`)?.number ?? numero.number;
  }
  return numero.number;
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

/**
 * Indica si un teléfono es un celular (para ofrecer WhatsApp). Usa el tipo
 * de número de libphonenumber-js con la misma metadata: MOBILE, o
 * FIXED_LINE_OR_MOBILE cuando el plan del país no permite distinguirlos.
 * En la Argentina, un celular lleva el 9 (internacional) o el 15 (local).
 * @param telefono teléfono guardado (en E.164) o escrito por el usuario
 * @returns true si se le puede escribir por WhatsApp
 */
export function esCelular(telefono: string): boolean {
  const numero = parsePhoneNumberFromString(telefono.trim(), REGION_TELEFONO);
  if (!numero?.isValid()) return false;
  const tipo = numero.getType();
  return tipo === 'MOBILE' || tipo === 'FIXED_LINE_OR_MOBILE';
}

/**
 * Link de WhatsApp con un mensaje ya escrito: https://wa.me/<número sin +>?text=<texto>.
 * Es la única función que lo arma.
 * @param telefono teléfono en E.164 ("+5491145892310")
 * @param texto mensaje a precargar
 * @returns la URL de wa.me
 */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  const numero = (aE164(telefono) ?? telefono).replace(/\D/g, '');
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
