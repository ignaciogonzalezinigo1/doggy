/**
 * Helpers de navegación compartidos por las pantallas.
 */
import { Href, router } from 'expo-router';

/** Espera a que se cierre un modal antes de abrir otro (en iOS no se pueden superponer). */
const ESPERA_CIERRE_MODAL_MS = 400;

/**
 * Vuelve a la pantalla anterior. Si no hay historial (por ejemplo, si se abrió
 * la pantalla desde un link o se recargó la app), va a la ruta de respaldo.
 * @param fallback ruta a la que ir si no se puede volver
 */
export function volver(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

/**
 * Abre "Encontré una mascota" con el código de una chapita ya leído, encima de
 * las tabs. Si el link abrió la app (o se viene del login) no hay nada debajo:
 * primero se pone Perdidos, así "volver" tiene adónde ir. Si la app ya estaba
 * abierta, se cierran los modales que hubiera para no apilar dos.
 * @param codigo código de la chapita, o el texto que llegó en el link
 * @param desdeIngreso true si se viene del login o el registro: se los reemplaza
 */
export function abrirChapita(codigo: string, desdeIngreso = false): void {
  const abrir = () => router.push({ pathname: '/reportar', params: { codigo } });
  if (!desdeIngreso && router.canDismiss()) {
    router.dismissAll();
    setTimeout(abrir, ESPERA_CIERRE_MODAL_MS);
    return;
  }
  router.replace('/perdidos');
  abrir();
}
