/**
 * Service de reportes de mascotas perdidas y encontradas (mapa comunitario).
 *
 * Un reporte lo edita o lo cierra quien lo publicó o cualquier persona
 * asignada a la mascota (lo controla el servidor).
 */
import type { CambiosReporte, NuevoReporte, ReportePerdida } from '@/types/models';
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
 * Publica un reporte nuevo.
 * Endpoint: POST /api/reportes
 *   { estado, mascotaId, nombre, raza, descripcion, foto, etiquetas, lat, lng, zona, fecha,
 *     radioMetros?, infoAdicional? } -> 201 ReportePerdida
 * @param datos datos del reporte
 * @returns el reporte creado
 */
export async function crearReporte(datos: NuevoReporte): Promise<ReportePerdida> {
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
 * Cierra un reporte porque la mascota ya apareció o volvió a casa: deja de
 * estar activo y sale del mapa. No se borra: el servidor lo guarda como
 * historial con su `resultado`: "devuelta" si había un encontrado (y entonces
 * cierra también el otro reporte activo de la mascota) o "aparecio".
 * Endpoint: PATCH /api/reportes/:id  { cerrado: true } -> 200 ReportePerdida (con cerradoEn y resultado)
 * @param id id del reporte
 * @returns el reporte cerrado
 */
export async function cerrarReporte(id: number): Promise<ReportePerdida> {
  return pedirJson<ReportePerdida>(`/api/reportes/${id}`, conCuerpo('PATCH', { cerrado: true }));
}
