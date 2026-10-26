/**
 * Service de sesión: registro, login y logout contra la API.
 * El token que devuelven registro y login lo guarda el `AppContext` con
 * `sesion.ts`; desde ahí `http.ts` lo manda en cada pedido.
 */
import type { Usuario } from '@/types/models';
import { conCuerpo, pedirJson, pedirSinRespuesta } from './http';

/** Lo que responden registro y login: el usuario y el token de la sesión nueva. */
export type SesionAbierta = {
  usuario: Usuario;
  token: string;
};

/** Datos del formulario de registro. */
export type DatosRegistro = {
  nombre: string;
  apellido: string;
  email: string;
  /** Obligatorio; el servidor lo guarda en E.164, como celular salvo que `telefonoFijo` sea true. */
  telefonoEmergencia: string;
  telefonoFijo: boolean;
  password: string;
};

/**
 * Crea una cuenta y deja la sesión abierta.
 * Endpoint: POST /api/auth/registro  { nombre, apellido, email, telefonoEmergencia, telefonoFijo, password }
 *   -> 201 { usuario, token } · 400 (también si falta el teléfono o no es válido) · 409 email ya registrado
 * @param datos datos del formulario, ya validados y limpios
 * @returns el usuario nuevo y su token
 */
export async function registrarse(datos: DatosRegistro): Promise<SesionAbierta> {
  return pedirJson<SesionAbierta>('/api/auth/registro', conCuerpo('POST', datos));
}

/**
 * Inicia sesión.
 * Endpoint: POST /api/auth/login  { email, password }
 *   -> 200 { usuario, token } · 401 "Email o contraseña incorrectos"
 * @param email email ingresado (en minúsculas)
 * @param password contraseña
 * @returns el usuario y su token
 */
export async function iniciarSesion(email: string, password: string): Promise<SesionAbierta> {
  return pedirJson<SesionAbierta>('/api/auth/login', conCuerpo('POST', { email, password }));
}

/**
 * Cierra la sesión en el servidor: desde ahí el token responde 401.
 * Endpoint: POST /api/auth/logout -> 204
 */
export async function cerrarSesion(): Promise<void> {
  await pedirSinRespuesta('/api/auth/logout', { method: 'POST' });
}
