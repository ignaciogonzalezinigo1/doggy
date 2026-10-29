/**
 * Service de fotos: sube al servidor las fotos elegidas en el celular.
 *
 * La galería y la cámara devuelven una URI local (file:// en iOS, content://
 * en Android, blob: en web) que es un archivo temporal: se pierde al cerrar
 * la app y nadie más la puede ver. Antes de guardar una mascota, el perfil, un
 * reporte o un registro, el `AppContext` pasa los datos por `conFotoSubida`:
 * si la foto es local la sube y la reemplaza por la ruta que devuelve el
 * servidor ("/uploads/abc.jpg"). Una foto que no cambió ya es una ruta del
 * servidor, así que no se vuelve a subir.
 *
 * Cómo viaja el archivo (SDK 58): el `fetch` global es el de `expo/fetch`,
 * que arma el multipart a mano y solo acepta strings, `Blob` u objetos con
 * `bytes()`. La parte `{ uri, name, type }` de React Native tira
 * "Unsupported FormDataPart implementation". Por eso en iOS y Android se
 * agrega un `File` de expo-file-system (que implementa `Blob` y `bytes()`) y
 * en web un Blob sacado de la URI blob:.
 */
import { File } from 'expo-file-system';

import { pedirJson } from './http';

/** Campo del multipart donde el servidor espera el archivo. */
const CAMPO_FOTO = 'foto';

/** Tiempo máximo de una subida: una foto tarda más que un pedido JSON, sobre todo con datos móviles. */
const TIEMPO_MAXIMO_SUBIDA_MS = 30000;

/** Esquemas de las URIs que apuntan a un archivo del dispositivo y no al servidor. */
const ESQUEMAS_LOCALES = ['file:', 'content:', 'blob:', 'data:', 'ph:', 'assets-library:'];

/** Esquemas que en web hay que leer como Blob antes de mandarlos. */
const ESQUEMAS_BLOB = ['blob:', 'data:'];

/** Extensiones de imagen que acepta el servidor. */
const EXTENSIONES_ACEPTADAS = ['jpg', 'jpeg', 'png', 'webp'];

/** Extensión que se usa cuando la URI no trae una (pasa con blob:). */
const EXTENSION_POR_DEFECTO = 'jpg';

/** Mensaje si el archivo temporal de la foto ya no está (por ejemplo, el sistema limpió la caché). */
const MENSAJE_FOTO_PERDIDA = 'No encontramos la foto en el celular. Elegila de nuevo.';

/**
 * Indica si una foto es un archivo del dispositivo que todavía no se subió.
 * @param foto valor del campo foto
 * @returns true si hay que subirla antes de guardar
 */
export function esFotoLocal(foto: string | null | undefined): foto is string {
  return !!foto && ESQUEMAS_LOCALES.some((esquema) => foto.startsWith(esquema));
}

/**
 * Nombre de archivo para el multipart de web, donde la URI blob: no trae
 * extensión. El servidor igual revisa el contenido: el nombre es solo informativo.
 * @param uri URI local de la foto
 * @returns por ejemplo "foto.jpg"
 */
function nombreArchivo(uri: string): string {
  const extension = uri.split(/[?#]/)[0]?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? '';
  return `foto.${EXTENSIONES_ACEPTADAS.includes(extension) ? extension : EXTENSION_POR_DEFECTO}`;
}

/**
 * Arma el FormData con la foto.
 * - Web (blob:, data:): se lee la URI como Blob con fetch.
 * - iOS y Android (file://, content://): un `File` de expo-file-system, que
 *   `expo/fetch` lee con `bytes()`. Trae su nombre y su tipo de la URI.
 * @param uri URI local de la foto
 * @returns el cuerpo del pedido
 * @throws si el archivo temporal ya no existe
 */
async function armarFormData(uri: string): Promise<FormData> {
  const datos = new FormData();
  if (ESQUEMAS_BLOB.some((esquema) => uri.startsWith(esquema))) {
    const blob = await (await fetch(uri)).blob();
    datos.append(CAMPO_FOTO, blob, nombreArchivo(uri));
    return datos;
  }
  const archivo = new File(uri);
  if (!archivo.exists) throw new Error(MENSAJE_FOTO_PERDIDA);
  datos.append(CAMPO_FOTO, archivo);
  return datos;
}

/**
 * Sube una foto al servidor.
 * Endpoint: POST /api/fotos  multipart con el archivo en "foto"
 *   -> 201 { foto: "/uploads/<nombre>.jpg" } · 400 no es JPG, PNG ni WEBP · 413 más de 5 MB
 * @param uri URI local de la foto (file://, content:// o blob:)
 * @returns la ruta relativa que hay que guardar en el campo foto
 * @throws con el mensaje del servidor si la subida falla
 */
export async function subirFoto(uri: string): Promise<string> {
  const body = await armarFormData(uri);
  const { foto } = await pedirJson<{ foto: string }>('/api/fotos', { method: 'POST', body }, TIEMPO_MAXIMO_SUBIDA_MS);
  return foto;
}

/**
 * Devuelve los datos con la foto ya subida: si el campo tiene una foto local,
 * la sube y lo reemplaza por la ruta del servidor; si no (no cambió, ya es una
 * ruta del servidor, es null o no vino), devuelve los mismos datos sin subir nada.
 * @param datos lo que se va a mandar al servidor
 * @param campo campo con la foto ("foto" o "fotoEtiqueta")
 * @returns un objeto nuevo con la ruta del servidor, o el mismo si no había nada que subir
 * @throws si la subida falla (así la pantalla muestra el error y no guarda)
 */
export async function conFotoSubida<T extends object, K extends keyof T>(datos: T, campo: K): Promise<T> {
  const foto = datos[campo];
  if (typeof foto !== 'string' || !esFotoLocal(foto)) return datos;
  return { ...datos, [campo]: await subirFoto(foto) };
}
