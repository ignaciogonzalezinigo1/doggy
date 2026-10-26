/**
 * Casilla de verificación con texto (por ejemplo, "Es un teléfono fijo").
 * Toda la fila es tocable, con al menos 44 px de alto.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme';

/** Alto mínimo: el área táctil recomendada. */
const ALTO_TACTIL = 44;

type Props = {
  label: string;
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
};

/**
 * Casilla con su texto.
 * @param props ver `Props`
 * @returns la fila tocable
 */
export function Casilla({ label, marcada, onCambiar }: Props) {
  return (
    <Pressable
      onPress={() => onCambiar(!marcada)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fila, pressed && styles.pressed]}
    >
      <MaterialIcons
        name={marcada ? 'check-box' : 'check-box-outline-blank'}
        size={sizes.iconMd}
        color={marcada ? colors.primary : colors.outline}
      />
      <Text style={styles.texto}>{label}</Text>
    </Pressable>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: ALTO_TACTIL,
  },
  pressed: {
    opacity: 0.6,
  },
  texto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
});
