/**
 * Cómo contactar a otra persona por una mascota encontrada, igual en todos
 * los lugares: quien la encontró a la familia (el detalle y las cards de
 * Perdidos, y "Encontré una mascota" si ya había avisado) y la familia a
 * quien la encontró (`AvisoEncontrada`).
 *
 * Si el teléfono es un celular, la acción principal es "Escribirle por
 * WhatsApp" con el mensaje ya escrito (`BotonWhatsApp`), y llamar queda como
 * un link chico ("o llamar"). Si es un fijo, WhatsApp no funciona: solo
 * aparece el link para llamar, con el número.
 *
 * Quien lo usa decide si mostrarlo, con el `contacto` que manda el servidor:
 * a la familia solo le escribe quien publicó un encontrado vinculado a la
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
  /** Arma el mensaje al tocar el botón. */
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
