/**
 * Link que abre la app para comunicarse: WhatsApp (wa.me). No se ofrece
 * llamar: el único medio de contacto entre la familia y quien encontró a la
 * mascota es WhatsApp.
 *
 * Los teléfonos llegan del servidor ya en E.164 ("+5491145892310"). Igual se
 * leen con `interpretarTelefono` (la regla de `telefonos.ts`), así un celular
 * escrito de otra forma ("11 15 4589-2310", "+54 9 11 4589-2310") también arma
 * bien el link. Solo se usa con celulares (`esCelular`), así que pasarlo a la
 * versión celular no cambia ningún número.
 */
import { interpretarTelefono } from './telefonos';

/**
 * Link de WhatsApp con un mensaje ya escrito: https://wa.me/<número sin +>?text=<texto>.
 * Es la única función que lo arma.
 * @param telefono celular, en E.164 o en cualquier formato argentino válido
 * @param texto mensaje a precargar
 * @returns la URL de wa.me
 */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  const lectura = interpretarTelefono(telefono);
  const numero = (lectura.ok ? lectura.e164 : telefono).replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
