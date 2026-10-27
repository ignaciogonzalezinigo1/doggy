/**
 * Cómo contactar a la familia de una mascota perdida, igual en todos los
 * lugares (la tarjeta del QR, el detalle del reporte y las cards de Perdidos).
 *
 * Si el teléfono es un celular, la acción principal es "Escribirle por
 * WhatsApp" con el mensaje ya escrito (`BotonWhatsApp`), y llamar queda como
 * un link chico ("o llamar"). Si es un fijo, WhatsApp no funciona: solo
 * aparece el link para llamar, con el número.
 *
 * Quien lo usa decide si mostrarlo: nunca al dueño ni a los asignados de la
 * mascota (ver `contactoDeLaFamilia`).
 */
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { esCelular } from '@/utils/telefonos';
import { BotonWhatsApp } from './BotonWhatsApp';
import { LinkTelefono } from './LinkTelefono';

type Props = {
  /** Teléfono de la familia, en E.164. */
  telefono: string;
  /** A quién se contacta. */
  nombre: string;
  /** Arma el mensaje al tocar el botón (puede pedir la ubicación). */
  armarMensaje: () => string | Promise<string>;
  /** En fila (para las cards): el botón y el link uno al lado del otro. */
  compacto?: boolean;
};

/**
 * Botón de WhatsApp con el link para llamar, o solo el link si es un fijo.
 * @param props ver `Props`
 * @returns las acciones de contacto
 */
export function ContactoDueno({ telefono, nombre, armarMensaje, compacto = false }: Props) {
  if (!esCelular(telefono)) return <LinkTelefono telefono={telefono} nombre={nombre} />;
  return (
    <View style={[styles.grupo, compacto && styles.fila]}>
      <BotonWhatsApp titulo="Escribirle por WhatsApp" telefono={telefono} armarMensaje={armarMensaje} principal />
      <LinkTelefono telefono={telefono} nombre={nombre} texto="o llamar" />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  grupo: {
    gap: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
});
