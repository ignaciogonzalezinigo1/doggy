/**
 * Service de reportes de mascotas perdidas y encontradas (mapa comunitario).
 *
 * Un reporte lo edita o lo cierra quien lo publicó o cualquier persona
 * asignada a la mascota (lo controla el servidor).
 */
import type { CambiosReporte, NuevoEncontrado, NuevoReporte, ReportePerdida } from '@/types/models';
import { conCuerpo, pedirJson } from './http';

/**
 * Lista los reportes activos de la zona.
 * Endpoint: GET /api/reportes -> 200 ReportePerdida[]
 * @returns los reportes
 */
export async function obtenerReportes(): Promise<ReportePerdida[]> {
  return pedirJson<ReportePerdida[]>('/api/reportes');
}

/**
 * Publica un perdido de una mascota del usuario.
 * Endpoint: POST /api/reportes
 *   { estado: 'perdido', mascotaId, descripcion, foto, lat, lng, zona, fecha,
 *     radioMetros?, infoAdicional? } -> 201 ReportePerdida
 * @param datos datos del reporte
 * @returns el reporte creado
 */
export async function crearReporte(datos: NuevoReporte): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>('/api/reportes', conCuerpo('POST', datos));
}

/**
 * Publica un encontrado: solo con el código del QR de la chapita (400 sin
 * código, 403 si la mascota es del usuario, 409 si ya avisó).
 * Endpoint: POST /api/reportes
 *   { estado: 'encontrado', codigo, mascotaId?, lat, lng, zona, fecha, infoAdicional? } -> 201 ReportePerdida
 * @param datos dónde está y el comentario opcional
 * @returns el encontrado creado, con los datos de la mascota
 */
export async function crearEncontrado(datos: NuevoEncontrado): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>('/api/reportes', conCuerpo('POST', datos));
}

/**
 * Modifica un reporte ya publicado (por ejemplo, el punto o el radio de búsqueda).
 * Las etiquetas que vienen reemplazan a todas; `infoAdicional: null` la borra.
 * Endpoint: PATCH /api/reportes/:id  { ...cambios } -> 200 ReportePerdida
 * @param id id del reporte
 * @param cambios campos a modificar
 * @returns el reporte actualizado
 */
export async function actualizarReporte(
  id: number,
  cambios: CambiosReporte,
): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>(`/api/reportes/${id}`, conCuerpo('PATCH', cambios));
}

/**
 * "Sí, se perdió": la familia confirma que se perdió la mascota de un
 * encontrado sin perdido. El servidor crea el perdido con los datos de la
 * mascota y el lugar y la hora del encontrado.
 * Endpoint: POST /api/reportes/:id/perdida (sin body) -> 201 ReportePerdida (el perdido)
 * @param encontradoId id del encontrado
 * @returns el perdido creado
 */
export async function confirmarPerdida(encontradoId: number): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>(`/api/reportes/${encontradoId}/perdida`, { method: 'POST' });
}

/**
 * Cierra un reporte porque la mascota ya apareció, volvió a casa o no se
 * había perdido: deja de estar activo y sale del mapa. No se borra: el
 * servidor lo guarda como historial con su `resultado`: "devuelta" en un
 * reencuentro (y cierra también los otros reportes activos de la mascota),
 * "aparecio" o "descartado" ("No, está conmigo", que cierra los encontrados).
 * Endpoint: PATCH /api/reportes/:id  { cerrado: true } -> 200 ReportePerdida (con cerradoEn y resultado)
 * @param id id del reporte
 * @returns el reporte cerrado
 */
export async function cerrarReporte(id: number): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>(`/api/reportes/${id}`, conCuerpo('PATCH', { cerrado: true }));
}
