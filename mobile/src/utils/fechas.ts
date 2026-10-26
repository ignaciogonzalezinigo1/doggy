/**
 * Utilidades de fechas.
 *
 * Los modelos guardan fechas ISO. Una fecha sola ("2026-05-10") la
 * interpreta `new Date` como medianoche UTC, que en Buenos Aires (UTC-3) cae
 * el día anterior. Por eso las fechas sin hora se arman a mano en hora local.
 */

/** Detecta fechas sin hora, del tipo AAAA-MM-DD. */
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte un string ISO a Date respetando la hora local para fechas sin hora.
 * @param iso fecha ISO, con o sin hora
 * @returns el objeto Date
 */
export function parsearFecha(iso: string): Date {
  const partes = SOLO_FECHA.exec(iso);
  if (partes) {
    const [, anio, mes, dia] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }
  return new Date(iso);
}

/**
 * Formatea una fecha como dd/mm/aaaa.
 * @param iso fecha ISO
 * @returns la fecha en formato argentino
 */
export function formatearFecha(iso: string): string {
  const fecha = parsearFecha(iso);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/**
 * Formatea la hora de una fecha como "10:30 hs".
 * @param iso fecha ISO con hora
 * @returns la hora en formato de 24 hs
 */
export function formatearHora(iso: string): string {
  const fecha = parsearFecha(iso);
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos} hs`;
}

/** Fecha escrita por el usuario: dd/mm/aaaa. */
const FECHA_INGRESADA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Va agregando las barras mientras el usuario escribe una fecha ("10052026" → "10/05/2026").
 * @param texto lo que hay en el campo
 * @returns el texto con formato dd/mm/aaaa (parcial si todavía no terminó)
 */
export function enmascararFecha(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean);
  return partes.join('/');
}

/**
 * Convierte una fecha dd/mm/aaaa a ISO (aaaa-mm-dd), verificando que exista.
 * @param texto fecha escrita por el usuario
 * @returns la fecha ISO, o null si el formato o el día no son válidos (ej. 31/02)
 */
export function fechaIngresadaAIso(texto: string): string | null {
  const partes = FECHA_INGRESADA.exec(texto.trim());
  if (!partes) return null;
  const [, dia, mes, anio] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  // Si el día no existe, Date lo corre al mes siguiente: así se detecta.
  const existe =
    fecha.getFullYear() === Number(anio) &&
    fecha.getMonth() === Number(mes) - 1 &&
    fecha.getDate() === Number(dia);
  return existe ? `${anio}-${mes}-${dia}` : null;
}

/**
 * Fecha de hoy a medianoche local, para comparar solo días.
 * @returns el Date de hoy sin hora
 */
export function hoy(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

const MINUTO_MS = 60 * 1000;
const HORA_MS = 60 * MINUTO_MS;
const DIA_MS = 24 * HORA_MS;

/**
 * Texto relativo de cuánto pasó desde una fecha: "Hace 5 min", "Hace 2h",
 * "Ayer", "Hace 3 días" o la fecha si pasó más de una semana.
 * @param iso fecha del evento
 * @param ahora fecha de referencia
 * @returns el texto para mostrar
 */
export function tiempoTranscurrido(iso: string, ahora: Date = new Date()): string {
  const fecha = parsearFecha(iso);
  const diferencia = ahora.getTime() - fecha.getTime();
  if (diferencia < HORA_MS) return `Hace ${Math.max(1, Math.round(diferencia / MINUTO_MS))} min`;
  if (diferencia < DIA_MS) return `Hace ${Math.round(diferencia / HORA_MS)}h`;
  if (diferencia < 2 * DIA_MS) return 'Ayer';
  if (diferencia < 7 * DIA_MS) return `Hace ${Math.floor(diferencia / DIA_MS)} días`;
  return formatearFecha(iso);
}

/**
 * Va agregando los dos puntos mientras el usuario escribe una hora ("1030" → "10:30").
 * @param texto lo que hay en el campo
 * @returns el texto con formato HH:MM (parcial si no terminó)
 */
export function enmascararHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
}

/**
 * Valida una hora HH:MM de 24 hs.
 * @param texto hora escrita
 * @returns horas y minutos, o null si no es válida
 */
export function parsearHora(texto: string): { horas: number; minutos: number } | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto.trim());
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return { horas, minutos };
}

/**
 * Formatea un Date como dd/mm/aaaa (para precargar campos de fecha).
 * @param fecha día
 * @returns el texto dd/mm/aaaa
 */
export function fechaATexto(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/**
 * Formatea la hora de un Date como HH:MM (para precargar campos de hora).
 * @param fecha momento
 * @returns el texto HH:MM, sin el "hs" de `formatearHora`
 */
export function horaATexto(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Meses cumplidos desde una fecha sin hora hasta hoy (la edad de una mascota).
 * Cuenta un mes más recién cuando se llega al mismo día del mes, igual que el servidor.
 * @param iso fecha AAAA-MM-DD (por ejemplo, la de nacimiento)
 * @param hasta fecha de referencia (hoy si no se pasa)
 * @returns los meses cumplidos (0 si todavía no cumplió uno)
 */
export function mesesCumplidos(iso: string, hasta: Date = hoy()): number {
  const desde = parsearFecha(iso);
  const meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  const ajuste = hasta.getDate() < desde.getDate() ? 1 : 0;
  return Math.max(0, meses - ajuste);
}
