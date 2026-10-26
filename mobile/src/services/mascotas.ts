/**
 * Service de mascotas del usuario.
 *
 * El servidor devuelve solo las mascotas a las que está asignado el usuario
 * (como dueño o invitado) y solo deja modificar esas. La excepción es la
 * búsqueda por el código del QR, que trae los datos públicos de cualquiera.
 */
import type { Mascota, MascotaPublica, NuevaMascota } from '@/types/models';
import { conCuerpo, ErrorApi, pedirJson } from './http';

/**
 * Lista las mascotas a las que está asignado el usuario.
 * Endpoint: GET /api/mascotas -> 200 Mascota[]
 * @returns las mascotas
 */
export async function obtenerMascotas(): Promise<Mascota[]> {
  return pedirJson<Mascota[]>('/api/mascotas');
}

/**
 * Busca una mascota por el código del QR de su chapita, aunque el usuario no
 * esté asignado a ella (quien encuentra un perro casi nunca es su dueño).
 * Endpoint: GET /api/mascotas/codigo/:codigo -> 200 MascotaPublica | 400 | 404
 * @param codigo código DOGGY-XXXX-NOMBRE (el servidor acepta minúsculas y espacios alrededor)
 * @returns los datos públicos de la mascota, o null si no hay ninguna con ese código
 * @throws `ErrorApi` si el servidor respondió otro error, o `Error` si no hubo conexión
 */
export async function buscarMascotaPorCodigo(codigo: string): Promise<MascotaPublica | null> {
  try {
    return await pedirJson<MascotaPublica>(`/api/mascotas/codigo/${encodeURIComponent(codigo.trim())}`);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 404) return null;
    throw error;
  }
}

/**
 * Registra una mascota nueva. El servidor le genera su código único para el
 * QR y deja al usuario como su dueño.
 * Endpoint: POST /api/mascotas  { nombre, raza, fechaNacimiento (AAAA-MM-DD), senas, foto } -> 201 Mascota
 * @param datos datos del formulario
 * @returns la mascota creada, con id y código
 */
export async function crearMascota(datos: NuevaMascota): Promise<Mascota> {
  return pedirJson<Mascota>('/api/mascotas', conCuerpo('POST', datos));
}

/**
 * Modifica datos de una mascota (el código no cambia). `foto: null` la borra.
 * Endpoint: PATCH /api/mascotas/:id  { ...cambios } -> 200 Mascota
 * @param id id de la mascota
 * @param cambios campos a modificar
 * @returns la mascota actualizada
 */
export async function actualizarMascota(id: number, cambios: Partial<NuevaMascota>): Promise<Mascota> {
  return pedirJson<Mascota>(`/api/mascotas/${id}`, conCuerpo('PATCH', cambios));
}
