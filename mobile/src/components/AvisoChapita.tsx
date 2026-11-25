/**
 * Aviso del login y el registro para quien llegó por el link de una chapita:
 * explica por qué hace falta una cuenta antes de ver a la mascota.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, sizes, spacing, typography } from '@/theme';

/** Aviso sobre el fondo teal, del mismo ancho que la card del formulario. */
export function AvisoChapita() {
  return (
    <View style={styles.aviso} accessibilityLiveRegion="polite">
      <MaterialIcons name="pets" size={sizes.iconMd} color={colors.primary} />
      <Text style={styles.texto}>
        Ingresá o creá tu cuenta para avisarle a la familia de la mascota que encontraste.
      </Text>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceBright,
  },
  texto: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
});
