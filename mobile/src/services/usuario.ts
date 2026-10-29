/**
 * Service del usuario logueado (perfil y contacto de emergencia).
 */
import type { DatosUsuario, Usuario } from '@/types/models';
import { conCuerpo, pedirJson } from './http';

/**
 * Trae el perfil del usuario.
 * Endpoint: GET /api/usuarios/me -> 200 Usuario
 * @returns el usuario
 */
export async function obtenerUsuario(): Promise<Usuario> {
  return pedirJson<Usuario>('/api/usuarios/me');
}

/**
 * Actualiza datos del perfil. `foto: null` borra la foto.
 * Endpoint: PATCH /api/usuarios/me
 *   { nombre?, apellido?, email?, ubicacion?, telefonoEmergencia?, foto? } -> 200 Usuario
 *   (el teléfono se guarda en E.164, siempre como celular)
 * @param datos campos a modificar
 * @returns el usuario actualizado
 */
export async function actualizarUsuario(datos: DatosUsuario): Promise<Usuario> {
  return pedirJson<Usuario>('/api/usuarios/me', conCuerpo('PATCH', datos));
}
