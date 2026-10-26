/**
 * Hook para el QR de una mascota como imagen: compartir el archivo y guardarlo
 * en la galería.
 *
 * La imagen sale de una vista que ya dibuja el QR (`FichaQr` en
 * `QrIdentificacion`): `react-native-view-shot` la captura como PNG en un
 * archivo temporal del cache, así no hace falta armar la imagen a mano.
 * - Compartir: abre la hoja de compartir con el ARCHIVO (`expo-sharing`), no
 *   con texto.
 * - Descargar: pide solo permiso de escritura de fotos (`expo-media-library`,
 *   `requestPermissionsAsync(true, ['photo'])`) y guarda el PNG con
 *   `Asset.create`. Si no se da el permiso o el sistema no deja guardar (por
 *   ejemplo, en alguna versión de Expo Go), ofrece la hoja de compartir, que
 *   tiene "Guardar imagen".
 * Los dos avisan cómo salió con un Alert.
 */
import * as Sharing from 'expo-sharing';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { useCallback, useState, type RefObject } from 'react';
import { Alert, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type UseQrImagen = {
  /** true mientras se arma la imagen y se comparte o se guarda. */
  trabajando: boolean;
  /** Abre la hoja de compartir con el PNG del QR. */
  compartir: () => Promise<void>;
  /** Guarda el PNG en la galería (o, si no se puede, ofrece compartirlo). */
  descargar: () => Promise<void>;
};

/**
 * Compartir y descargar el QR como imagen.
 * @param ficha ref de la vista con el QR, el nombre y "Escaneame con Doggy"
 * @param nombre nombre de la mascota (para el título de la hoja de compartir)
 * @returns el estado de carga y las dos acciones
 */
export function useQrImagen(ficha: RefObject<ViewInstance | null>, nombre: string): UseQrImagen {
  const [trabajando, setTrabajando] = useState(false);

  /**
   * Captura la ficha como PNG en un archivo temporal.
   * @returns la URI local del archivo
   */
  const capturar = useCallback(
    () => captureRef(ficha, { format: 'png', quality: 1, result: 'tmpfile' }),
    [ficha],
  );

  /**
   * Abre la hoja de compartir con un archivo ya capturado.
   * @param uri archivo PNG
   */
  const abrirHoja = useCallback(
    async (uri: string) => {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No se puede compartir', 'Este dispositivo no tiene una hoja para compartir archivos.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `QR de ${nombre}` });
    },
    [nombre],
  );

  const compartir = useCallback(async () => {
    setTrabajando(true);
    try {
      await abrirHoja(await capturar());
    } catch {
      Alert.alert('No se pudo compartir el QR', 'Probá de nuevo en unos segundos.');
    } finally {
      setTrabajando(false);
    }
  }, [abrirHoja, capturar]);

  const descargar = useCallback(async () => {
    setTrabajando(true);
    let uri: string | null = null;
    try {
      uri = await capturar();
      // Solo escritura y solo fotos: el permiso mínimo para guardar una imagen.
      const permiso = await requestPermissionsAsync(true, ['photo']);
      if (!permiso.granted) throw new Error('sin permiso');
      await Asset.create(uri);
      Alert.alert('Listo', 'QR guardado en tu galería.');
    } catch {
      const archivo = uri;
      if (!archivo) {
        Alert.alert('No se pudo guardar el QR', 'Probá de nuevo en unos segundos.');
      } else {
        Alert.alert(
          'No pudimos guardarlo en la galería',
          'Podés abrir la hoja de compartir y elegir "Guardar imagen".',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir', onPress: () => abrirHoja(archivo).catch(() => undefined) },
          ],
        );
      }
    } finally {
      setTrabajando(false);
    }
  }, [abrirHoja, capturar]);

  return { trabajando, compartir, descargar };
}
