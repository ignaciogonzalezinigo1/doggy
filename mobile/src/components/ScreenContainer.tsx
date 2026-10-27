/**
 * Contenedor base de las pantallas.
 *
 * Respeta la safe area, aplica el fondo crema (o el color que se le pase) y
 * los márgenes laterales. Con `scroll` envuelve el contenido en un ScrollView
 * dentro de un KeyboardAvoidingView, para que los formularios no queden
 * tapados por el teclado.
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** Si es true el contenido scrollea y se ajusta al teclado. */
  scroll?: boolean;
  /** Color de fondo; por defecto el crema global. */
  backgroundColor?: string;
  /** Bordes de la safe area a respetar. Por defecto todos menos el inferior (lo cubre la tab bar). */
  edges?: Edge[];
  /** Si es false no se aplican los márgenes laterales. */
  padded?: boolean;
  /** Estilo extra para el contenido. */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Envuelve una pantalla con safe area, fondo y scroll opcional.
 * @param props ver `Props`
 * @returns la pantalla contenida
 */
export function ScreenContainer({
  children,
  scroll = false,
  backgroundColor = colors.surface,
  edges = ['top', 'left', 'right'],
  padded = true,
  contentStyle,
}: Props) {
  const inner = [padded && styles.padded, contentStyle];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      {scroll ? (
        <KeyboardAvoidingView
          style={styles.flex}
          // Padding en los dos: con edge-to-edge (SDK 58) Android ya no achica la
        // ventana con el teclado, y si la achica el desplazamiento calculado da 0.
        behavior="padding"
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, inner]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.flex, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.containerMargin,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
