/**
 * Validaciones locales de formularios.
 *
 * Mientras no haya backend, los formularios solo chequean formato. Cada
 * función devuelve el mensaje de error a mostrar o undefined si el valor es válido.
 *
 * Todos los campos de texto tienen un largo máximo (`LIMITES`, que también se
 * usa como `maxLength` de los inputs) y una lista de caracteres permitidos
 * según lo que se carga: nombres de personas solo con letras, nombres de
 * mascotas con letras y números, y textos libres con letras,
 * números y signos de puntuación comunes. Así no se cargan emojis, símbolos
 * raros, caracteres invisibles ni textos hechos solo de signos ("!!!!").
 * Antes de guardar, `limpiarTexto` saca los espacios de más.
 */

import { fechaIngresadaAIso, hoy, parsearFecha, parsearHora } from './fechas';
import { interpretarTelefono } from './telefonos';

/** Largo máximo de cada campo de texto de la app (es el `maxLength` del input). */
export const LIMITES = {
  nombrePersona: 40,
  email: 100,
  password: 64,
  ubicacion: 60,
  telefono: 25,
  nombreMascota: 30,
  raza: 40,
  senas: 200,
  descripcion: 300,
  infoAdicional: 300,
  motivo: 80,
  lugar: 80,
  nombreRegistro: 60,
  profesional: 60,
  codigoAsignacion: 16,
  busqueda: 50,
} as const;

/** Letras del español (con tildes, ñ y ü) y de otros idiomas latinos. */
const LETRAS = 'A-Za-zÀ-ÖØ-öø-ÿ';
const LETRA_REGEX = new RegExp(`[${LETRAS}]`, 'g');

/** Palabras de letras separadas por un espacio, guion o apóstrofe ("María José", "O'Connor"). */
const NOMBRE_PERSONA_REGEX = new RegExp(`^[${LETRAS}]+(?:[ '’-][${LETRAS}]+)*$`);

/** Palabras de letras o números separadas por un espacio, guion, punto o apóstrofe ("Toby 2", "Ch. Sharpei"). */
const NOMBRE_REGEX = new RegExp(`^[${LETRAS}0-9]+(?:[ '’.-]+[${LETRAS}0-9]+)*\\.?$`);

/**
 * Caracteres aceptados en un texto libre: letras, números, espacios, saltos
 * de línea y la puntuación de uso común. Incluye las comillas y guiones
 * "tipográficos" que iOS pone solo al escribir (“ ” ‘ ’ – — …).
 */
const CARACTER_TEXTO_REGEX = new RegExp(`[${LETRAS}0-9 \\n.,;:¡!¿?()"'/+#°º%&@\\-“”‘’–—…]`);

/** Formato del email: usuario@dominio.ext, sin espacios ni puntos seguidos. */
const EMAIL_REGEX =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/**
 * Normaliza un texto antes de validarlo o guardarlo: saca los espacios de los
 * bordes y los repetidos y, en textos de varias líneas, deja como mucho una
 * línea en blanco seguida.
 * @param texto lo que escribió el usuario
 * @param multilinea true si el campo admite saltos de línea
 * @returns el texto limpio
 */
export function limpiarTexto(texto: string, multilinea = false): string {
  const lineas = texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linea) => linea.replace(/[ \t\u00A0]+/g, ' ').trim());
  if (!multilinea) return lineas.join(' ').replace(/ +/g, ' ').trim();
  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Cuenta las letras de un texto (sin números, espacios ni signos).
 * @param texto texto a revisar
 * @returns cantidad de letras
 */
function contarLetras(texto: string): number {
  return texto.match(LETRA_REGEX)?.length ?? 0;
}

type FormatoTexto = 'nombrePersona' | 'nombre' | 'texto';

type OpcionesTexto = {
  /** Mensaje si el campo queda vacío; sin él, el campo es opcional. */
  requerido?: string;
  /** Largo mínimo, una vez limpio. */
  min?: number;
  /** Largo máximo, una vez limpio. */
  max: number;
  /** Qué caracteres se aceptan. */
  formato: FormatoTexto;
  /** true si el campo admite saltos de línea. */
  multilinea?: boolean;
};

/**
 * Validación común de los campos de texto: obligatorio, largo y caracteres permitidos.
 * @param texto lo que escribió el usuario
 * @param opciones reglas del campo
 * @returns mensaje de error o undefined
 */
export function validarTexto(texto: string, opciones: OpcionesTexto): string | undefined {
  const { requerido, min = 1, max, formato, multilinea = false } = opciones;
  const valor = limpiarTexto(texto, multilinea);
  if (!valor) return requerido;
  if (valor.length < min) return `Tiene que tener al menos ${min} caracteres.`;
  if (valor.length > max) return `Puede tener hasta ${max} caracteres.`;

  if (formato === 'nombrePersona') {
    if (!NOMBRE_PERSONA_REGEX.test(valor)) return 'Usá solo letras, espacios, guiones o apóstrofes.';
    return undefined;
  }
  if (formato === 'nombre') {
    if (!NOMBRE_REGEX.test(valor)) return 'Usá solo letras, números, espacios, puntos y guiones.';
    if (contarLetras(valor) === 0) return 'Tiene que tener al menos una letra.';
    return undefined;
  }
  // Texto libre: se muestra el primer carácter que no se acepta, para que se entienda qué sacar.
  const invalido = Array.from(valor).find((c) => !CARACTER_TEXTO_REGEX.test(c));
  if (invalido) {
    return invalido.trim()
      ? `No se puede usar “${invalido}”. Usá letras, números y signos comunes.`
      : 'Tiene caracteres que no se pueden usar.';
  }
  if (contarLetras(valor) < 2) return 'Escribilo con palabras, no solo con números o signos.';
  return undefined;
}

/**
 * Valida el nombre o el apellido de una persona.
 * @param texto texto ingresado
 * @param mensaje error a mostrar si está vacío
 * @returns mensaje de error o undefined
 */
export function validarNombrePersona(texto: string, mensaje: string): string | undefined {
  return validarTexto(texto, {
    requerido: mensaje,
    min: 2,
    max: LIMITES.nombrePersona,
    formato: 'nombrePersona',
  });
}

/**
 * Valida un email.
 * @param email texto ingresado
 * @returns mensaje de error o undefined
 */
export function validarEmail(email: string): string | undefined {
  const valor = email.trim();
  if (!valor) return 'Ingresá tu email.';
  if (valor.length > LIMITES.email) return `El email puede tener hasta ${LIMITES.email} caracteres.`;
  if (!EMAIL_REGEX.test(valor) || valor.includes('..')) return 'El email no tiene un formato válido.';
  return undefined;
}

/**
 * Pasa un email al formato en que se guarda: sin espacios y en minúsculas.
 * @param email texto ingresado
 * @returns el email normalizado
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida la contraseña del login: obligatoria y sin pasarse del largo máximo.
 * @param password texto ingresado
 * @returns mensaje de error o undefined
 */
export function validarPasswordRequerida(password: string): string | undefined {
  if (!password) return 'Ingresá tu contraseña.';
  if (password.length > LIMITES.password) {
    return `La contraseña puede tener hasta ${LIMITES.password} caracteres.`;
  }
  return undefined;
}

/** Largo mínimo de una contraseña nueva. */
export const PASSWORD_MIN = 8;

/**
 * Valida una contraseña nueva: entre 8 y 64 caracteres, sin espacios y con
 * al menos una letra y un número.
 * @param password texto ingresado
 * @returns mensaje de error o undefined
 */
export function validarPasswordNueva(password: string): string | undefined {
  if (!password) return 'Ingresá una contraseña.';
  if (password.length < PASSWORD_MIN) {
    return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (password.length > LIMITES.password) {
    return `La contraseña puede tener hasta ${LIMITES.password} caracteres.`;
  }
  if (/\s/.test(password)) return 'La contraseña no puede tener espacios.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Usá al menos una letra y un número.';
  }
  return undefined;
}

/**
 * Valida que la confirmación coincida con la contraseña.
 * @param password contraseña elegida
 * @param confirmacion texto repetido por el usuario
 * @returns mensaje de error o undefined
 */
export function validarConfirmacion(password: string, confirmacion: string): string | undefined {
  if (!confirmacion) return 'Repetí la contraseña.';
  if (password !== confirmacion) return 'Las contraseñas no coinciden.';
  return undefined;
}

/**
 * Valida la ubicación del usuario ("Palermo, Buenos Aires").
 * @param texto texto ingresado
 * @returns mensaje de error o undefined
 */
export function validarUbicacion(texto: string): string | undefined {
  return validarTexto(texto, {
    requerido: 'Ingresá tu barrio y ciudad.',
    min: 3,
    max: LIMITES.ubicacion,
    formato: 'texto',
  });
}

/**
 * Valida el nombre de una mascota.
 * @param texto texto ingresado
 * @param requerido false si el campo es opcional (quien encontró un perro puede no saberlo)
 * @returns mensaje de error o undefined
 */
export function validarNombreMascota(texto: string, requerido = true): string | undefined {
  return validarTexto(texto, {
    requerido: requerido ? 'Ingresá el nombre de tu mascota.' : undefined,
    min: 2,
    max: LIMITES.nombreMascota,
    formato: 'nombre',
  });
}

/**
 * Valida la raza de una mascota.
 * @param texto texto ingresado
 * @param requerido false si el campo es opcional
 * @returns mensaje de error o undefined
 */
export function validarRaza(texto: string, requerido = true): string | undefined {
  return validarTexto(texto, {
    requerido: requerido ? 'Ingresá la raza (o "Mestizo").' : undefined,
    min: 3,
    max: LIMITES.raza,
    formato: 'nombre',
  });
}

/** Edad máxima razonable de una mascota, en años. */
export const EDAD_MAXIMA = 30;

/**
 * Valida una fecha escrita como dd/mm/aaaa.
 * @param texto lo que escribió el usuario
 * @returns mensaje de error o undefined
 */
export function validarFechaIngresada(texto: string): string | undefined {
  if (!texto.trim()) return 'Ingresá la fecha.';
  if (!fechaIngresadaAIso(texto)) return 'Usá el formato dd/mm/aaaa con una fecha real.';
  return undefined;
}

/**
 * Suma años a una fecha (negativo para restar).
 * @param fecha fecha de partida
 * @param anios años a sumar
 * @returns la fecha nueva
 */
function sumarAnios(fecha: Date, anios: number): Date {
  return new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());
}

/** Hasta cuántos años en el futuro se puede agendar un turno. */
const ANIOS_TURNO_MAXIMO = 2;
/** Hasta cuántos años después de la aplicación puede ser un refuerzo. */
const ANIOS_REFUERZO_MAXIMO = 5;

/**
 * Valida la fecha de aplicación de un registro sanitario: formato válido,
 * no futura (en el carnet solo se cargan aplicaciones ya hechas) y no más
 * vieja que la edad máxima de una mascota.
 * @param texto fecha dd/mm/aaaa
 * @returns mensaje de error o undefined
 */
export function validarFechaAplicacion(texto: string): string | undefined {
  const error = validarFechaIngresada(texto);
  if (error) return error;
  const iso = fechaIngresadaAIso(texto);
  if (!iso) return undefined;
  const fecha = parsearFecha(iso);
  if (fecha > hoy()) return 'Una aplicación no puede tener fecha futura.';
  if (fecha < sumarAnios(hoy(), -EDAD_MAXIMA)) return 'Revisá el año: la fecha es demasiado vieja.';
  return undefined;
}

/**
 * Valida la fecha de nacimiento de una mascota: formato válido, no futura y
 * de hace como mucho `EDAD_MAXIMA` años (lo mismo que valida el servidor).
 * @param texto fecha dd/mm/aaaa
 * @returns mensaje de error o undefined
 */
export function validarFechaNacimiento(texto: string): string | undefined {
  const error = validarFechaIngresada(texto);
  if (error) return error;
  const iso = fechaIngresadaAIso(texto);
  if (!iso) return undefined;
  const fecha = parsearFecha(iso);
  if (fecha > hoy()) return 'La fecha de nacimiento no puede ser futura.';
  if (fecha < sumarAnios(hoy(), -EDAD_MAXIMA)) {
    return `Revisá el año: una mascota no puede tener más de ${EDAD_MAXIMA} años.`;
  }
  return undefined;
}

/**
 * Valida la fecha opcional del próximo refuerzo: si viene, tiene que tener
 * formato válido, ser posterior a la aplicación y no estar a más de 5 años.
 * @param texto fecha dd/mm/aaaa del refuerzo (puede estar vacía)
 * @param aplicacion fecha dd/mm/aaaa de la aplicación
 * @returns mensaje de error o undefined
 */
export function validarProximaDosis(texto: string, aplicacion: string): string | undefined {
  if (!texto.trim()) return undefined;
  const iso = fechaIngresadaAIso(texto);
  if (!iso) return 'Usá el formato dd/mm/aaaa con una fecha real.';
  const isoAplicacion = fechaIngresadaAIso(aplicacion);
  if (!isoAplicacion) return undefined;
  const refuerzo = parsearFecha(iso);
  const aplicada = parsearFecha(isoAplicacion);
  if (refuerzo <= aplicada) return 'El refuerzo tiene que ser posterior a la aplicación.';
  if (refuerzo > sumarAnios(aplicada, ANIOS_REFUERZO_MAXIMO)) {
    return `El refuerzo no puede ser a más de ${ANIOS_REFUERZO_MAXIMO} años de la aplicación.`;
  }
  return undefined;
}

/**
 * Valida la fecha de un turno: formato válido y no más de 2 años adelante
 * (que sea a futuro se revisa junto con la hora, en el formulario).
 * @param texto fecha dd/mm/aaaa
 * @returns mensaje de error o undefined
 */
export function validarFechaTurno(texto: string): string | undefined {
  const error = validarFechaIngresada(texto);
  if (error) return error;
  const iso = fechaIngresadaAIso(texto);
  if (iso && parsearFecha(iso) > sumarAnios(hoy(), ANIOS_TURNO_MAXIMO)) {
    return `El turno no puede ser a más de ${ANIOS_TURNO_MAXIMO} años.`;
  }
  return undefined;
}

/**
 * Valida una hora escrita como HH:MM.
 * @param texto lo que escribió el usuario
 * @returns mensaje de error o undefined
 */
export function validarHora(texto: string): string | undefined {
  if (!texto.trim()) return 'Ingresá la hora.';
  if (!parsearHora(texto)) return 'Usá el formato HH:MM (por ejemplo, 10:30).';
  return undefined;
}

/**
 * Valida un teléfono con la regla compartida con el servidor
 * (`interpretarTelefono` de `telefonos.ts`, el mismo archivo en los dos repos):
 * solo de la Argentina y un número real, escrito en cualquier formato habitual.
 * @param telefono texto ingresado
 * @returns mensaje de error o undefined
 */
export function validarTelefono(telefono: string): string | undefined {
  const valor = telefono.trim();
  if (!valor) return 'Ingresá un teléfono de contacto.';
  if (!/^\+?[\d\s\-().]+$/.test(valor)) return 'Usá solo números, espacios, guiones, paréntesis y "+".';
  const leido = interpretarTelefono(valor);
  return leido.ok ? undefined : leido.error;
}

/**
 * Descarta mientras se escribe lo que no puede ir en un teléfono (letras, símbolos).
 * @param texto lo que escribió o pegó el usuario
 * @returns solo números, espacios, guiones, paréntesis, puntos y "+"
 */
export function filtrarTelefono(texto: string): string {
  return texto.replace(/[^\d\s+\-().]/g, '');
}
