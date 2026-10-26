/**
 * Aviso destacado "¡Encontraron a {nombre}!" para una mascota del usuario que
 * alguien reportó como encontrada (por ejemplo, escaneando su chapita).
 *
 * Muestra dónde y cuándo la encontraron, la descripción que dejó quien la
 * encontró y, si viene, su contacto con un link para llamarlo y, si es un
 * celular, "Escribirle por WhatsApp" con un mensaje ya escrito (con el punto
 * del reporte en Google Maps). "Ya la recuperé" pide confirmación y cierra el
 * reporte (y el de perdida, si había).
 * Se muestra en Mis Mascotas y en el perfil de la mascota.
 */
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { formatearFecha, formatearHora, tiempoTranscurrido } from '@/utils/fechas';
import { enlaceMapa, esCelular } from '@/utils/telefonos';
import { BotonWhatsApp } from '../BotonWhatsApp';
import { LinkTelefono } from '../LinkTelefono';
import { PrimaryButton } from '../PrimaryButton';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  /** Reporte "encontrado" de la mascota. */
  reporte: ReportePerdida;
  /** Pide confirmación y cierra los reportes. */
  onRecuperada: (reporte: ReportePerdida) => void;
  /** true mientras se cierran los reportes. */
  recuperando?: boolean;
};

/**
 * Aviso de mascota encontrada.
 * @param props ver `Props`
 * @returns la card con los datos del reporte y "Ya la recuperé"
 */
export function AvisoEncontrada({ reporte, onRecuperada, recuperando = false }: Props) {
  const { usuario } = useApp();
  const cuando = `${tiempoTranscurrido(reporte.fecha)} · ${formatearFecha(reporte.fecha)} ${formatearHora(reporte.fecha)}`;

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <MaterialIcons name="celebration" size={sizes.iconMd} color={colors.primary} />
        <Text style={styles.titulo} accessibilityRole="header">
          ¡Encontraron a {reporte.nombre}!
        </Text>
      </View>

      <Dato icono="location-on" etiqueta="Dónde" valor={reporte.zona} />
      <Dato icono="schedule" etiqueta="Cuándo" valor={cuando} />
      <Text style={styles.descripcion}>{reporte.descripcion}</Text>

      {reporte.contacto && (
        <View style={styles.contacto}>
          <Text style={styles.contactoTexto}>La encontró {reporte.contacto.nombre}. Llamá para coordinar la vuelta:</Text>
          <LinkTelefono telefono={reporte.contacto.telefono} nombre={reporte.contacto.nombre} />
          {esCelular(reporte.contacto.telefono) && (
            <BotonWhatsApp
              titulo="Escribirle por WhatsApp"
              telefono={reporte.contacto.telefono}
              armarMensaje={() =>
                `¡Hola ${reporte.contacto?.nombre}! Soy ${usuario?.nombre ?? 'de su familia'}, de la familia de ${reporte.nombre}. ` +
                `Vi tu aviso en Doggy, ¡muchas gracias! ¿Cómo coordinamos para buscarla?\n${enlaceMapa(reporte)}`
              }
            />
          )}
        </View>
      )}

      <PrimaryButton
        title="Ya la recuperé"
        icon="home"
        iconLeft
        onPress={() => onRecuperada(reporte)}
        loading={recuperando}
      />
    </View>
  );
}

type DatoProps = {
  icono: IconName;
  etiqueta: string;
  valor: string;
};

/**
 * Fila de dato: ícono, etiqueta y valor.
 * @param props ver `DatoProps`
 * @returns la fila
 */
function Dato({ icono, etiqueta, valor }: DatoProps) {
  return (
    <View style={styles.dato}>
      <MaterialIcons name={icono} size={sizes.iconSm} color={colors.onSurfaceVariant} />
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
    ...shadows.level1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.primary,
    flex: 1,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  datoEtiqueta: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    width: 64,
  },
  datoValor: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  descripcion: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  contacto: {
    gap: spacing.xs,
  },
  contactoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
});
