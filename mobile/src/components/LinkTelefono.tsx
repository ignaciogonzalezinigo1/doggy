/**
 * Teléfono que se puede tocar para llamar (link `tel:`). Lo usan el aviso
 * "¡Encontraron a …!" (para llamar a quien la encontró) y la mascota
 * identificada por el QR cuando está perdida (para llamar a su tutor).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme';

type Props = {
  /** Teléfono como lo cargó el usuario ("+54 9 11 4589-2310"). */
  telefono: string;
  /** A quién se llama, para el lector de pantalla. */
  nombre: string;
};

/**
 * Link para llamar a un teléfono.
 * @param props ver `Props`
 * @returns el número con un ícono de llamada
 */
export function LinkTelefono({ telefono, nombre }: Props) {
  /** Abre el marcador del celular con el número (sin espacios ni guiones). */
  const llamar = async () => {
    try {
      await Linking.openURL(`tel:${telefono.replace(/[^\d+]/g, '')}`);
    } catch {
      Alert.alert('No se pudo abrir el teléfono', `Llamá a ${nombre} al ${telefono}.`);
    }
  };

  return (
    <Pressable
      onPress={llamar}
      hitSlop={spacing.sm}
      accessibilityRole="link"
      accessibilityLabel={`Llamar a ${nombre} al ${telefono}`}
      style={styles.link}
    >
      {({ pressed }) => (
        <>
          <MaterialIcons name="call" size={sizes.iconSm} color={colors.primary} />
          <Text style={[styles.numero, pressed && styles.pressed]}>{telefono}</Text>
        </>
      )}
    </Pressable>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  numero: {
    ...typography.labelMd,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
