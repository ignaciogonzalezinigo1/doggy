/**
 * Código de la chapita que se abrió con un link y todavía no se mostró.
 *
 * Quien escanea una chapita con la cámara del celular puede no tener sesión
 * (o tenerla vencida): el código se guarda acá apenas llega el link y, después
 * del login o el registro, la app sigue en la tarjeta de esa mascota.
 *
 * Almacenamiento: `expo-secure-store` (en la web, `localStorage`), igual que
 * el token de `sesion.ts`, así sobrevive si el sistema cierra la app mientras
 * la persona se registra. No pide permisos. Vence a la hora para que un link
 * viejo no reaparezca días después.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { extraerCodigoMascota } from '@/utils/codigos';

/** Clave con la que se guarda (SecureStore solo acepta letras, números, ".", "-" y "_"). */
const CLAVE_CHAPITA = 'doggy.chapitaPendiente';
/** Cuánto vale un código guardado: una hora. */
const VIGENCIA_MS = 60 * 60 * 1000;

/**
 * Guarda el código de un link hasta que se pueda mostrar su tarjeta. Pisa al anterior.
 * @param codigo código DOGGY-XXXX-NOMBRE ya validado
 */
export async function guardarChapitaPendiente(codigo: string): Promise<void> {
  const valor = JSON.stringify({ codigo, vence: Date.now() + VIGENCIA_MS });
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CLAVE_CHAPITA, valor);
  } else {
    await SecureStore.setItemAsync(CLAVE_CHAPITA, valor);
  }
}

/**
 * Lee el código guardado. No falla: si no se puede leer, es como si no hubiera.
 * @returns el código, o null si no hay o ya venció
 */
export async function leerChapitaPendiente(): Promise<string | null> {
  try {
    const valor =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(CLAVE_CHAPITA) ?? null
        : await SecureStore.getItemAsync(CLAVE_CHAPITA);
    if (!valor) return null;
    const { codigo, vence } = JSON.parse(valor) as { codigo?: string; vence?: number };
    if (!codigo || !vence || vence < Date.now()) {
      await borrarChapitaPendiente();
      return null;
    }
    return extraerCodigoMascota(codigo);
  } catch (e) {
    console.warn('No se pudo leer la chapita pendiente:', e);
    return null;
  }
}

/** Borra el código guardado (ya se mostró, no existe o se cerró la sesión). No falla. */
export async function borrarChapitaPendiente(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(CLAVE_CHAPITA);
    } else {
      await SecureStore.deleteItemAsync(CLAVE_CHAPITA);
    }
  } catch (e) {
    console.warn('No se pudo borrar la chapita pendiente:', e);
  }
}
