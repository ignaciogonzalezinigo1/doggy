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
import { Alert } from 'react-native';

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

/**
 * Aviso no bloqueante al guardar un teléfono: si es válido pero fijo, avisa
 * que no va a servir para WhatsApp y deja elegir. "Guardar igual" sigue con
 * `continuar`; "Corregir" vuelve al formulario. Si es celular, sigue directo.
 * Lo usan el registro y el perfil.
 * @param telefono teléfono ya validado con `validarTelefono`
 * @param continuar lo que guarda
 */
export function confirmarSiEsFijo(telefono: string, continuar: () => void): void {
  if (esCelular(telefono)) {
    continuar();
    return;
  }
  Alert.alert(
    'Teléfono fijo',
    'Lo guardamos como teléfono fijo: no se va a poder usar WhatsApp. Si es un celular, agregá el 15.',
    [
      { text: 'Corregir', style: 'cancel' },
      { text: 'Guardar igual', onPress: continuar },
    ],
  );
}
