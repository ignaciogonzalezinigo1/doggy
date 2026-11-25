/**
 * ID único de cada mascota y el link del QR de su chapita.
 * Formato del ID: DOGGY-XXXX-NOMBRE (cuatro dígitos y el nombre en mayúsculas sin tildes).
 * Lo genera el servidor al dar de alta la mascota; la app solo lo valida al leerlo.
 *
 * El QR lleva un link a `/encontre/<código>` (lo arma `enlaceChapita`, en
 * `enlaces.ts`). Las chapitas impresas antes tienen el código solo: las dos
 * formas se leen con `extraerCodigoMascota`.
 */

/** Expresión que valida un código leído (por ejemplo, desde un QR). */
export const CODIGO_MASCOTA_REGEX = /^DOGGY-\d{4}-[A-Z0-9]+$/;

/** Ruta de Expo Router que recibe el link de la chapita (`app/encontre/[codigo].tsx`). */
export const RUTA_CHAPITA = 'encontre';

/**
 * Link de una chapita: `doggy://encontre/…` (build), `exp://<IP>:8081/--/encontre/…`
 * (Expo Go) o `http(s)://…/encontre/…` (web). El grupo es el código.
 */
const ENLACE_CHAPITA_REGEX = new RegExp(`^(?:doggy|exps?|https?)://(?:[^?#]*/)?${RUTA_CHAPITA}/([^/?#]+)`, 'i');

/**
 * Código de mascota de un texto leído de un QR: el código solo o el link de la
 * chapita. Acepta minúsculas y espacios alrededor.
 * @param texto texto del QR, o el código que llegó en el link
 * @returns el código normalizado, o null si no es de una chapita Doggy
 */
export function extraerCodigoMascota(texto: string): string | null {
  const limpio = texto.trim();
  const codigo = (ENLACE_CHAPITA_REGEX.exec(limpio)?.[1] ?? limpio).toUpperCase();
  return CODIGO_MASCOTA_REGEX.test(codigo) ? codigo : null;
}
