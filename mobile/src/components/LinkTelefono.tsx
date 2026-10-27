/**
 * Teléfono que se puede tocar para llamar (link `tel:`). Lo usan el aviso
 * "¡Encontraron a …!" (para llamar a quien la encontró) y la mascota
 * identificada por el QR cuando está perdida (para llamar a su tutor).
 * Con `texto` muestra ese texto chico en lugar del número (el "o llamar" que
 * acompaña al botón de WhatsApp en `ContactoDueno`).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme';
import { enlaceTelefono } from '@/utils/enlaces';
import { formatearTelefono } from '@/utils/telefonos';

type Props = {
  /** Teléfono guardado, en E.164 ("+5491145892310"). */
  telefono: string;
  /** A quién se llama, para el lector de pantalla. */
  nombre: string;
  /** Texto a mostrar en lugar del número, sin ícono. */
  texto?: string;
};

/**
 * Link para llamar a un teléfono.
 * @param props ver `Props`
 * @returns el número con un ícono de llamada
 */
export function LinkTelefono({ telefono, nombre, texto }: Props) {
  /** Se muestra legible ("+54 9 11 4589-2310"); el link usa E.164. */
  const legible = formatearTelefono(telefono);

  /** Abre el marcador del celular con el número. */
  const llamar = async () => {
    try {
      await Linking.openURL(enlaceTelefono(telefono));
    } catch {
      Alert.alert('No se pudo abrir el teléfono', `Llamá a ${nombre} al ${legible}.`);
    }
  };

  return (
    <Pressable
      onPress={llamar}
      hitSlop={spacing.sm}
      accessibilityRole="link"
      accessibilityLabel={`Llamar a ${nombre} al ${legible}`}
      style={styles.link}
    >
      {({ pressed }) => (
        <>
          {!texto && <MaterialIcons name="call" size={sizes.iconSm} color={colors.primary} />}
          <Text style={[texto ? styles.secundario : styles.numero, pressed && styles.pressed]}>
            {texto ?? legible}
          </Text>
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
  secundario: {
    ...typography.bodySm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
