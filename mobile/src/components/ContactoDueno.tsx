/**
 * Cómo contactar a otra persona por una mascota encontrada, igual en todos
 * los lugares: quien la encontró a la familia (el detalle y las cards de
 * Perdidos, y "Encontré una mascota" si ya había avisado) y la familia a
 * quien la encontró (`AvisoEncontrada`).
 *
 * El único medio es WhatsApp, con el mensaje ya escrito (`BotonWhatsApp`):
 * no se ofrece llamar. Si no hay teléfono o es un fijo (a un fijo no se le
 * puede escribir por WhatsApp), en lugar del botón va un texto breve que lo
 * explica.
 *
 * Quien lo usa decide si mostrarlo, con el `contacto` que manda el servidor:
 * a la familia solo le escribe quien publicó un encontrado vinculado a la
 * mascota (ver `encontradoDelUsuario`).
 */
import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { esCelular } from '@/utils/telefonos';
import { BotonWhatsApp } from './BotonWhatsApp';

type Props = {
  /** A quién se le escribe, o null si no cargó teléfono. */
  contacto: ReportePerdida['contacto'] | null;
  /** Arma el mensaje al tocar el botón. */
  armarMensaje: () => string | Promise<string>;
};

/**
 * Botón de WhatsApp, o el texto que explica por qué no se puede escribir.
 * @param props ver `Props`
 * @returns el botón o el aviso
 */
export function ContactoDueno({ contacto, armarMensaje }: Props) {
  if (!contacto || !esCelular(contacto.telefono)) {
    return (
      <Text style={styles.sinWhatsApp}>
        {contacto
          ? `${contacto.nombre} no tiene un celular con WhatsApp cargado.`
          : 'No cargó un celular con WhatsApp: no se le puede escribir desde Doggy.'}
      </Text>
    );
  }
  return (
    <BotonWhatsApp titulo="Escribirle por WhatsApp" telefono={contacto.telefono} armarMensaje={armarMensaje} principal />
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  sinWhatsApp: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
