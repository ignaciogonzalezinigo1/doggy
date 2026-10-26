/**
 * Resumen de solo lectura con los datos del perfil de la mascota que se va a
 * reportar: foto, nombre, raza, edad, señas particulares e ID de la chapita.
 * Son los datos que se publican; para cambiarlos se edita el perfil.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { Mascota } from '@/types/models';
import { textoEdad } from '@/utils/etiquetas';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';

type Props = {
  mascota: Mascota;
};

/**
 * Card con los datos precargados del perfil.
 * @param props.mascota mascota a mostrar
 * @returns la card
 */
export function ResumenMascota({ mascota }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cabecera}>
        <Avatar foto={mascota.foto} nombre={mascota.nombre} size={sizes.avatarMd} />
        <View style={styles.textos}>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <View style={styles.chips}>
            <Chip label={mascota.raza} />
            <Chip label={textoEdad(mascota.fechaNacimiento)} />
          </View>
        </View>
      </View>

      <View style={styles.dato}>
        <MaterialIcons name="info-outline" size={sizes.iconSm} color={colors.onSurfaceVariant} />
        <Text style={styles.datoTexto}>{mascota.senas}</Text>
      </View>
      <View style={styles.dato}>
        <MaterialIcons name="qr-code-2" size={sizes.iconSm} color={colors.onSurfaceVariant} />
        <Text style={styles.codigo}>{mascota.codigo}</Text>
      </View>

      <Text style={styles.ayuda}>Datos de su perfil. Si algo cambió, editalo desde su perfil.</Text>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  textos: {
    flex: 1,
    gap: spacing.xs,
  },
  nombre: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  datoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  codigo: {
    ...typography.labelMd,
    color: colors.primary,
  },
  ayuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
