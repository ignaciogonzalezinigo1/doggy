/**
 * Encabezado de pantallas internas: botón de volver, título y subtítulo opcional.
 * Se usa en las pantallas que se apilan sobre una tab (alta, carnet, etc.).
 * La variante `bar` es una barra fija arriba (con safe area y sombra leve) y
 * el título en teal, como en el carnet sanitario.
 * Dentro de un modal (`enModal`), en iOS no suma el inset de arriba: la hoja
 * del modal ya arranca debajo de la barra de estado y el espacio quedaba
 * duplicado. En Android el modal ocupa toda la pantalla y el inset hace falta.
 * A la derecha va siempre el avatar del usuario (`AvatarPerfil`), igual que
 * en `AppHeader`, para que el acceso al perfil esté en todas las pantallas.
 */
import type { Href } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';
import { AvatarPerfil } from './AvatarPerfil';
import { BackButton } from './BackButton';

type Props = {
  title: string;
  subtitle?: string;
  /** Ruta de respaldo si no hay historial para volver. */
  fallback?: Href;
  variant?: 'plain' | 'bar';
  /** true si la pantalla se abre como modal (`presentation: 'modal'`). */
  enModal?: boolean;
};

/**
 * Header con volver y título.
 * @param props ver `Props`
 * @returns el encabezado
 */
export function ScreenHeader({
  title,
  subtitle,
  fallback = '/mascotas',
  variant = 'plain',
  enModal = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const esBarra = variant === 'bar';
  // La hoja de un modal en iOS ya deja libre la barra de estado.
  const insetArriba = enModal && Platform.OS === 'ios' ? 0 : insets.top;

  return (
    <View style={[styles.header, esBarra && [styles.bar, { paddingTop: insetArriba + spacing.sm }]]}>
      <BackButton fallback={fallback} />
      <View style={styles.texts}>
        {/* En pantallas chicas el título se achica (hasta 75 %) antes de cortarse con "…". */}
        <Text
          style={[styles.title, esBarra && styles.titleBar]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <AvatarPerfil />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackSm,
  },
  bar: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
    zIndex: 1,
  },
  texts: {
    flex: 1,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  titleBar: {
    color: colors.primary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
