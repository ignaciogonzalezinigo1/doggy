/**
 * Service del usuario logueado (perfil y contacto de emergencia).
 */
import type { CambiosUsuario, Usuario } from '@/types/models';
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
 *   { nombre?, apellido?, email?, ubicacion?, telefonoEmergencia?, telefonoFijo?, foto? } -> 200 Usuario
 *   (el teléfono se guarda como celular salvo `telefonoFijo: true`)
 * @param datos campos a modificar
 * @returns el usuario actualizado
 */
export async function actualizarUsuario(datos: CambiosUsuario): Promise<Usuario> {
  return pedirJson<Usuario>('/api/usuarios/me', conCuerpo('PATCH', datos));
}
