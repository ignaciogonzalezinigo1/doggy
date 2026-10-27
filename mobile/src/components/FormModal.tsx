/**
 * Modal tipo "hoja" que sube desde abajo, para formularios cortos
 * (agregar registro, nuevo turno, editar datos). Tiene título, botón de
 * cerrar, scroll y ajuste al teclado.
 */
import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Hoja modal con formulario.
 * @param props visibilidad, título, cierre y contenido
 * @returns el modal
 */
export function FormModal({ visible, titulo, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        // Padding en los dos: con edge-to-edge (SDK 58) Android ya no achica la
        // ventana con el teclado, y si la achica el desplazamiento calculado da 0.
        behavior="padding"
      >
        {/* Tocar el fondo oscuro también cierra */}
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={({ pressed }) => [styles.cerrar, pressed && styles.cerrarPressed]}
            >
              <MaterialIcons name="close" size={sizes.iconMd} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '90%',
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.level2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.stackSm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  cerrar: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  contenido: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
});
