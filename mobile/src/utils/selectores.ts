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
 * Encontrados activos de una mascota, del más reciente al más viejo. Puede
 * haber varios: cada persona que la encontró publica el suyo.
 * @param reportes todos los reportes
 * @param mascotaId id de la mascota
 * @returns los encontrados (vacío si nadie avisó que la encontró)
 */
export function encontradosDe(reportes: ReportePerdida[], mascotaId: number): ReportePerdida[] {
  return filtrarReportes(reportes, '', 'encontrado').filter((r) => r.mascotaId === mascotaId);
}

/**
 * Hallazgo de un reporte de perdido: el "encontrado" activo más reciente de
 * la misma mascota. Mientras la familia no la recupera, los dos siguen
 * activos y son un reencuentro.
 * @param reportes todos los reportes
 * @param reporte reporte de perdido
 * @returns el encontrado, o undefined si no es un perdido de una mascota o nadie la encontró
 */
export function hallazgoDe(
  reportes: ReportePerdida[],
  reporte: ReportePerdida,
): ReportePerdida | undefined {
  if (reporte.estado !== 'perdido' || reporte.mascotaId === null) return undefined;
  return encontradosDe(reportes, reporte.mascotaId)[0];
}

/**
 * Reencuentro: un perdido y uno o más encontrados activos de la misma
 * mascota. En Perdidos es una sola card y un solo pin verde, en el lugar del
 * encontrado más reciente (`encontrados[0]`), que es donde está ahora.
 */
export type Reencuentro = { perdido: ReportePerdida; encontrados: ReportePerdida[] };

/**
 * Aviso para la familia de una mascota que alguien encontró:
 * - reencuentro: tenía un perdido activo ("¡Encontraron a …!");
 * - dudoso: no tenía perdido ("Alguien encontró a … ¿Se perdió …?").
 * En los dos, `encontrados[0]` es el más reciente.
 */
export type AvisoMascota =
  | ({ tipo: 'reencuentro' } & Reencuentro)
  | { tipo: 'dudoso'; encontrados: ReportePerdida[] };

/**
 * Aviso de una mascota del usuario que alguien encontró, si hay.
 * @param reportes todos los reportes
 * @param mascotaId id de la mascota
 * @returns el aviso, o undefined si nadie avisó que la encontró
 */
export function avisoDeMascota(reportes: ReportePerdida[], mascotaId: number): AvisoMascota | undefined {
  const encontrados = encontradosDe(reportes, mascotaId);
  if (encontrados.length === 0) return undefined;
  const perdido = reporteActivo(reportes, mascotaId);
  return perdido ? { tipo: 'reencuentro', perdido, encontrados } : { tipo: 'dudoso', encontrados };
}

/**
 * Reencuentros de Perdidos, por id del reporte que los representa (el
 * encontrado más reciente).
 * @param reportes todos los reportes
 * @returns id del encontrado que se dibuja → su reencuentro
 */
export function reencuentrosPorReporte(reportes: ReportePerdida[]): Map<number, Reencuentro> {
  const reencuentros = new Map<number, Reencuentro>();
  for (const perdido of reportes) {
    if (perdido.estado !== 'perdido' || perdido.mascotaId === null) continue;
    const encontrados = encontradosDe(reportes, perdido.mascotaId);
    if (encontrados.length > 0) reencuentros.set(encontrados[0].id, { perdido, encontrados });
  }
  return reencuentros;
}

/**
 * Reportes de la pantalla Perdidos (mapa, carrusel y lista). Un reencuentro
 * es un solo reporte: su encontrado más reciente; el perdido y los otros
 * encontrados de la mascota no se dibujan. Como lo representa un encontrado,
 * aparece con "Todos" y "Encontrados", no con "Perdidos" (ya la encontraron).
 * @param reportes todos los reportes
 * @param busqueda texto buscado (nombre o zona)
 * @param estado filtro de estado
 * @param reencuentros los de `reencuentrosPorReporte`
 * @returns los reportes a mostrar, del más reciente al más viejo
 */
export function reportesDePerdidos(
  reportes: ReportePerdida[],
  busqueda: string,
  estado: FiltroEstado,
  reencuentros: ReadonlyMap<number, Reencuentro>,
): ReportePerdida[] {
  const ocultos = new Set<number>();
  for (const { perdido, encontrados } of reencuentros.values()) {
    ocultos.add(perdido.id);
    for (const otro of encontrados.slice(1)) ocultos.add(otro.id);
  }
  return filtrarReportes(
    reportes.filter((r) => !ocultos.has(r.id)),
    busqueda,
    estado,
  );
}

/**
 * Reporte que se dibuja en Perdidos en lugar de otro: el de un reencuentro
 * si el reporte es parte de uno (por ejemplo, al llegar con el id de un
 * perdido), o el mismo reporte.
 * @param reencuentros los de `reencuentrosPorReporte`
 * @param reporte reporte buscado
 * @returns el reporte que tiene pin propio
 */
export function reporteVisible(
  reencuentros: ReadonlyMap<number, Reencuentro>,
  reporte: ReportePerdida,
): ReportePerdida {
  for (const { perdido, encontrados } of reencuentros.values()) {
    if (perdido.id === reporte.id || encontrados.some((e) => e.id === reporte.id)) return encontrados[0];
  }
  return reporte;
}

/**
 * Encontrado activo que publicó el usuario de una mascota, si tiene (cada
 * persona puede tener uno por mascota).
 * @param reportes todos los reportes
 * @param mascotaId id de la mascota
 * @param usuarioId usuario logueado
 * @returns su encontrado, o undefined
 */
export function encontradoPropio(
  reportes: ReportePerdida[],
  mascotaId: number,
  usuarioId: number | undefined,
): ReportePerdida | undefined {
  return encontradosDe(reportes, mascotaId).find((r) => r.autorId === usuarioId);
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

/**
 * Contacto de la familia para quien encontró a la mascota: solo si el
 * usuario publicó un encontrado vinculado a ella (el servidor manda el
 * contacto únicamente en ese encontrado). Nunca para el dueño ni un asignado,
 * que ven el de quien la encontró en el aviso.
 * @param reporte reporte de Perdidos
 * @param reencuentro su reencuentro, si es parte de uno
 * @param usuarioId usuario logueado
 * @param mascotas mascotas de la cuenta del usuario
 * @returns nombre y teléfono de la familia, o undefined si no corresponde
 */
export function contactoDeLaFamilia(
  reporte: ReportePerdida,
  reencuentro: Reencuentro | undefined,
  usuarioId: number | undefined,
  mascotas: Mascota[],
): ReportePerdida['contacto'] {
  if (reporte.mascotaId === null || mascotas.some((m) => m.id === reporte.mascotaId)) return undefined;
  const encontrados = reencuentro?.encontrados ?? [reporte];
  return encontrados.find((r) => r.estado === 'encontrado' && r.autorId === usuarioId)?.contacto;
}

/**
 * Indica si el usuario puede avisar que encontró la mascota de un perdido
 * ("Encontré a …" en el detalle): es un perdido de una mascota registrada que
 * no es suya ni publicó él, y todavía no avisó que la encontró.
 * @param reporte reporte de Perdidos
 * @param reencuentro su reencuentro, si es parte de uno
 * @param usuarioId usuario logueado
 * @param mascotas mascotas de la cuenta del usuario
 * @returns el perdido sobre el que se avisa, o undefined si no corresponde
 */
export function perdidoParaAvisar(
  reporte: ReportePerdida,
  reencuentro: Reencuentro | undefined,
  usuarioId: number | undefined,
  mascotas: Mascota[],
): ReportePerdida | undefined {
  const perdido = reencuentro?.perdido ?? (reporte.estado === 'perdido' ? reporte : undefined);
  if (!perdido || perdido.mascotaId === null || usuarioId === undefined) return undefined;
  if (perdido.autorId === usuarioId || mascotas.some((m) => m.id === perdido.mascotaId)) return undefined;
  if (reencuentro?.encontrados.some((e) => e.autorId === usuarioId)) return undefined;
  return perdido;
}
