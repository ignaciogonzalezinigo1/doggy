/**
 * Selectores: funciones puras que derivan datos a partir del estado global
 * (por ejemplo, la última vacuna de una mascota). Así no se guarda en el
 * estado nada que se pueda calcular.
 */
import type {
  EstadoReporte,
  Mascota,
  RegistroSanitario,
  ReportePerdida,
  TipoRegistro,
  Turno,
} from '@/types/models';
import { hoy, parsearFecha } from './fechas';

/**
 * Busca una mascota por el id que llega en la ruta.
 * @param mascotas lista completa
 * @param id id como string (los params de la ruta siempre son texto)
 * @returns la mascota o undefined si no existe
 */
export function buscarMascota(mascotas: Mascota[], id: string | undefined): Mascota | undefined {
  const numero = Number(id);
  return mascotas.find((m) => m.id === numero);
}

/**
 * Última vacuna aplicada a una mascota.
 * @param registros todos los registros sanitarios
 * @param mascotaId id de la mascota
 * @returns el registro más reciente, o undefined si no tiene vacunas
 */
export function ultimaVacuna(
  registros: RegistroSanitario[],
  mascotaId: number,
): RegistroSanitario | undefined {
  return registros
    .filter((r) => r.mascotaId === mascotaId && r.tipo === 'vacuna')
    .sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime())[0];
}

/**
 * Próximo turno de una mascota a partir de ahora.
 * @param turnos todos los turnos
 * @param mascotaId id de la mascota
 * @param ahora fecha de referencia (se puede pasar para testear)
 * @returns el turno más cercano en el futuro, o undefined
 */
export function proximoTurno(
  turnos: Turno[],
  mascotaId: number,
  ahora: Date = new Date(),
): Turno | undefined {
  return turnos
    .filter((t) => t.mascotaId === mascotaId && parsearFecha(t.fecha) >= ahora)
    .sort((a, b) => parsearFecha(a.fecha).getTime() - parsearFecha(b.fecha).getTime())[0];
}

/**
 * Registros de una mascota y un tipo, del más nuevo al más viejo.
 * @param registros todos los registros
 * @param mascotaId id de la mascota
 * @param tipo tipo a filtrar
 * @returns la lista filtrada y ordenada
 */
export function registrosPorTipo(
  registros: RegistroSanitario[],
  mascotaId: number,
  tipo: TipoRegistro,
): RegistroSanitario[] {
  return registros
    .filter((r) => r.mascotaId === mascotaId && r.tipo === tipo)
    .sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
}

/**
 * Próximo refuerzo: la aplicación cuya `proximaDosis` a futuro es la más cercana.
 * Solo cuenta la última aplicación de cada nombre: si la antirrábica ya se
 * volvió a dar, el refuerzo que indicaba la dosis anterior deja de valer.
 * @param registros registros ya filtrados de una mascota y un tipo
 * @param desde fecha de referencia (se puede pasar para testear)
 * @returns el registro con el refuerzo más próximo, o undefined
 */
export function proximoRefuerzo(
  registros: RegistroSanitario[],
  desde: Date = hoy(),
): RegistroSanitario | undefined {
  const ultimaPorNombre = new Map<string, RegistroSanitario>();
  for (const r of registros) {
    const clave = r.nombre.trim().toLowerCase();
    const previa = ultimaPorNombre.get(clave);
    if (!previa || parsearFecha(r.fecha) > parsearFecha(previa.fecha)) ultimaPorNombre.set(clave, r);
  }
  return [...ultimaPorNombre.values()]
    .filter((r) => r.proximaDosis && parsearFecha(r.proximaDosis) >= desde)
    .sort(
      (a, b) => parsearFecha(a.proximaDosis!).getTime() - parsearFecha(b.proximaDosis!).getTime(),
    )[0];
}

/** Filtro de estado de la pantalla Perdidos. */
export type FiltroEstado = 'todos' | EstadoReporte;

/**
 * Quita tildes y pasa a minúsculas para comparar textos de búsqueda.
 * @param texto texto original
 * @returns texto normalizado
 */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Filtra reportes por texto (nombre o zona) y por estado, del más reciente al más viejo.
 * @param reportes todos los reportes
 * @param busqueda texto buscado
 * @param estado filtro de estado
 * @returns los reportes que coinciden
 */
export function filtrarReportes(
  reportes: ReportePerdida[],
  busqueda: string,
  estado: FiltroEstado,
): ReportePerdida[] {
  const termino = normalizar(busqueda.trim());
  return reportes
    .filter((r) => estado === 'todos' || r.estado === estado)
    .filter(
      (r) => !termino || normalizar(r.nombre).includes(termino) || normalizar(r.zona).includes(termino),
    )
    .sort((a, b) => parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime());
}

/**
 * Reporte de "perdido" activo de una mascota, si tiene (el más reciente).
 * @param reportes todos los reportes
 * @param mascotaId id de la mascota
 * @returns el reporte o undefined si no está reportada como perdida
 */
export function reporteActivo(
  reportes: ReportePerdida[],
  mascotaId: number,
): ReportePerdida | undefined {
  return filtrarReportes(reportes, '', 'perdido').find((r) => r.mascotaId === mascotaId);
}

/**
 * Reporte de "encontrado" activo de una mascota, si tiene (el más reciente):
 * alguien la encontró, por ejemplo escaneando su chapita. Se usa con las
 * mascotas del usuario para avisarle "¡Encontraron a …!".
 * @param reportes todos los reportes
 * @param mascotaId id de la mascota
 * @returns el reporte o undefined si nadie avisó que la encontró
 */
export function reporteEncontrado(
  reportes: ReportePerdida[],
  mascotaId: number,
): ReportePerdida | undefined {
  return filtrarReportes(reportes, '', 'encontrado').find((r) => r.mascotaId === mascotaId);
}

/**
 * Indica si el usuario puede editar o cerrar un reporte de perdido: lo
 * publicó él o la mascota está en su cuenta (dueño o invitado), así quien la
 * encuentre de la familia puede sacarla del mapa aunque no la haya reportado.
 * @param reporte reporte a revisar
 * @param usuarioId usuario logueado
 * @param mascotas mascotas de la cuenta del usuario
 * @returns true si puede gestionarlo
 */
export function puedeGestionarReporte(
  reporte: ReportePerdida,
  usuarioId: number | undefined,
  mascotas: Mascota[],
): boolean {
  if (reporte.estado !== 'perdido') return false;
  if (reporte.autorId === usuarioId) return true;
  return reporte.mascotaId !== null && mascotas.some((m) => m.id === reporte.mascotaId);
}
