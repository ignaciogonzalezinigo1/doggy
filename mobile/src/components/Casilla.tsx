/**
 * Casilla de verificación con texto (por ejemplo, "Es un teléfono fijo").
 * Toda la fila es tocable. Se ve del alto del ícono, para quedar pegada al
 * campo de arriba con el mismo espaciado que el resto del formulario, y el
 * área táctil llega a 44 px con `hitSlop`. Con `disabled` se apaga y no responde.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme';

/** Alto mínimo del área táctil recomendada. */
const ALTO_TACTIL = 44;
/** Lo que se agranda el área táctil arriba y abajo para llegar a `ALTO_TACTIL`. */
const MARGEN_TACTIL = (ALTO_TACTIL - sizes.iconMd) / 2;

type Props = {
  label: string;
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  disabled?: boolean;
};

/**
 * Casilla con su texto.
 * @param props ver `Props`
 * @returns la fila tocable
 */
export function Casilla({ label, marcada, onCambiar, disabled = false }: Props) {
  return (
    <Pressable
      onPress={() => onCambiar(!marcada)}
      disabled={disabled}
      hitSlop={{ top: MARGEN_TACTIL, bottom: MARGEN_TACTIL }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fila, (pressed || disabled) && styles.apagada]}
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
    minHeight: sizes.iconMd,
  },
  apagada: {
    opacity: 0.6,
  },
  texto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
});
