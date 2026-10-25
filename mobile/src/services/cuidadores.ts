/**
 * Service de las personas asignadas a cada mascota y de los códigos de asignación.
 *
 * Reglas (las valida el servidor):
 * - Solo un dueño de la mascota puede generar códigos de asignación.
 * - Un código es de un solo uso: sirve para una sola persona.
 * - Cualquiera puede desasignarse, salvo que sea el último dueño: la mascota
 *   no puede quedar sin nadie que pueda administrarla.
 */
import type { Cuidador, Invitacion, Mascota, RolMascota } from '@/types/models';
import { conCuerpo, pedirJson, pedirSinRespuesta } from './http';

/**
 * Normaliza un código tal como lo cargó el usuario (sin espacios, en mayúsculas).
 * @param token código ingresado
 * @returns el código listo para la URL
 */
function rutaToken(token: string): string {
  return encodeURIComponent(token.trim().toUpperCase());
}

/**
 * Lista las personas asignadas a las mascotas del usuario logueado (él incluido).
 * Endpoint: GET /api/cuidadores -> 200 Cuidador[]
 * @returns las asignaciones
 */
export async function obtenerCuidadores(): Promise<Cuidador[]> {
  return pedirJson<Cuidador[]>('/api/cuidadores');
}

/**
 * Genera un código de asignación. Solo lo puede hacer un dueño de la mascota.
 * Endpoint: POST /api/mascotas/:id/invitaciones  { rol } -> 201 Invitacion | 403
 * @param mascota mascota a la que se invita
 * @param rol rol con el que va a quedar quien acepte
 * @returns la invitación con su código
 */
export async function crearInvitacion(mascota: Mascota, rol: RolMascota): Promise<Invitacion> {
  return pedirJson<Invitacion>(`/api/mascotas/${mascota.id}/invitaciones`, conCuerpo('POST', { rol }));
}

/**
 * Busca un código de asignación y verifica que se pueda usar.
 * Endpoint: GET /api/invitaciones/:token -> 200 Invitacion | 404 | 410
 * @param token código de asignación
 * @returns la invitación
 * @throws si no existe o ya se usó
 */
export async function obtenerInvitacion(token: string): Promise<Invitacion> {
  return pedirJson<Invitacion>(`/api/invitaciones/${rutaToken(token)}`);
}

/**
 * Acepta un código: el servidor asigna al usuario logueado a la mascota con
 * el rol del código y lo marca como usado.
 * Endpoint: POST /api/invitaciones/:token/aceptar -> 200 Cuidador | 404 | 409 | 410
 * @param token código de asignación
 * @returns la asignación creada
 * @throws si el código no se puede usar o el usuario ya está asignado
 */
export async function aceptarInvitacion(token: string): Promise<Cuidador> {
  return pedirJson<Cuidador>(`/api/invitaciones/${rutaToken(token)}/aceptar`, { method: 'POST' });
}

/**
 * Desasigna al usuario logueado de una mascota. El último dueño no puede irse.
 * Endpoint: DELETE /api/mascotas/:id/cuidadores/me -> 204 | 409 único dueño
 * @param mascotaId mascota de la que se va
 * @throws si no está asignado o es el único dueño
 */
export async function desasignarme(mascotaId: number): Promise<void> {
  await pedirSinRespuesta(`/api/mascotas/${mascotaId}/cuidadores/me`, { method: 'DELETE' });
}
