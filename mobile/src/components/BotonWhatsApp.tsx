/**
 * Botón que abre WhatsApp con un mensaje ya escrito para un teléfono.
 *
 * Arma el link con `enlaceWhatsApp` (wa.me, la utilidad única) y lo abre con
 * `Linking.openURL`. El mensaje se arma recién al tocar, con los datos
 * de ese momento. Si WhatsApp no se puede abrir, avisa.
 *
 * Mostrarlo solo para celulares (`esCelular`): a un fijo no se le puede escribir.
 * Con `principal` es el botón lleno (el único medio de contacto, ver
 * `ContactoDueno`); si no, va con borde.
 */
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { enlaceWhatsApp } from '@/utils/enlaces';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  /** Texto del botón. */
  titulo: string;
  /** Teléfono de quien recibe el mensaje, en E.164. */
  telefono: string;
  /** Arma el texto del mensaje al tocar el botón. */
  armarMensaje: () => string | Promise<string>;
  /** Botón lleno, para cuando escribir es la acción principal. */
  principal?: boolean;
};

/**
 * Botón de WhatsApp.
 * @param props ver `Props`
 * @returns el botón
 */
export function BotonWhatsApp({ titulo, telefono, armarMensaje, principal = false }: Props) {
  const [abriendo, setAbriendo] = useState(false);

  /** Arma el mensaje y abre WhatsApp; si no se puede, avisa sin trabar la pantalla. */
  const abrir = async () => {
    setAbriendo(true);
    try {
      await Linking.openURL(enlaceWhatsApp(telefono, await armarMensaje()));
    } catch {
      Alert.alert(
        'No pudimos abrir WhatsApp',
        'Fijate que esté instalado y volvé a intentar.',
      );
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <PrimaryButton
      title={titulo}
      icon="chat"
      iconLeft
      variant={principal ? 'primary' : 'outline'}
      size="sm"
      onPress={abrir}
      loading={abriendo}
    />
  );
}
