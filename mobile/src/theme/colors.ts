/**
 * Paleta de colores de Doggy.
 *
 * Los tokens salen del sistema de diseño (misma nomenclatura, en camelCase)
 * y al final se suman los colores de marca que se usan en toda la app.
 * Ningún componente debería escribir un HEX a mano: todo sale de acá.
 */

/** Tokens del sistema de diseño. */
const tokens = {
  surface: '#FFF8F0',
  surfaceDim: '#E0D9D0',
  surfaceBright: '#FFF8F0',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FAF3E9',
  surfaceContainer: '#F4EDE3',
  surfaceContainerHigh: '#EEE7DD',
  surfaceContainerHighest: '#E8E2D8',
  onSurface: '#1E1B16',
  onSurfaceVariant: '#3E4946',
  inverseSurface: '#33302A',
  inverseOnSurface: '#F7F0E6',
  outline: '#6E7976',
  outlineVariant: '#BEC9C5',
  surfaceTint: '#006B5D',
  primary: '#006054',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1F7A6C',
  onPrimaryContainer: '#B3FFEE',
  inversePrimary: '#83D6C5',
  secondary: '#006B5D',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#8FF5E0',
  onSecondaryContainer: '#007163',
  tertiary: '#774C00',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#976200',
  onTertiaryContainer: '#FFEEDC',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  primaryFixed: '#9FF2E1',
  primaryFixedDim: '#83D6C5',
  onPrimaryFixed: '#00201B',
  onPrimaryFixedVariant: '#005046',
  secondaryFixed: '#8FF5E0',
  secondaryFixedDim: '#72D8C4',
  onSecondaryFixed: '#00201B',
  onSecondaryFixedVariant: '#005046',
  tertiaryFixed: '#FFDDB5',
  tertiaryFixedDim: '#FFB956',
  onTertiaryFixed: '#2A1800',
  onTertiaryFixedVariant: '#643F00',
  background: '#FFF8F0',
  onBackground: '#1E1B16',
  surfaceVariant: '#E8E2D8',
} as const;

/** Colores de marca y auxiliares. */
const brand = {
  /** Headers, botones primarios y navegación. */
  teal: '#1F7A6C',
  /** Estados activos y chips (al 10 %). */
  tealLight: '#2E9C8A',
  /** Chips y fondos suaves: teal claro al 10 % de opacidad. */
  tealLight10: 'rgba(46, 156, 138, 0.10)',
  /** Reencuentros: el pin, la marca y el aviso de una mascota perdida que alguien encontró. */
  verde: '#2E8540',
  /** Fondo suave de los reencuentros: el verde al 10 % de opacidad. */
  verde10: 'rgba(46, 133, 64, 0.10)',
  /** Verde agua del sistema con transparencia, para chips, badges y decoraciones. */
  secondaryContainer30: 'rgba(143, 245, 224, 0.30)',
  secondaryContainer20: 'rgba(143, 245, 224, 0.20)',
  /** Mostaza oscuro con transparencia, para la decoración de la card de turnos. */
  tertiaryContainer10: 'rgba(151, 98, 0, 0.10)',
  /** Velos sobre la cámara, para que los controles se lean sobre cualquier imagen. */
  cameraOverlay: 'rgba(0, 0, 0, 0.45)',
  cameraControl: 'rgba(0, 0, 0, 0.55)',
  /** Fondo casi negro del visor de fotos a pantalla completa. */
  visorFondo: 'rgba(0, 0, 0, 0.92)',
  whiteTranslucent: 'rgba(255, 255, 255, 0.92)',
  /** Fondo suave del recuadro de ayuda del escáner. */
  primary5: 'rgba(0, 96, 84, 0.05)',
  primary15: 'rgba(0, 96, 84, 0.15)',
  /** Velo oscuro detrás de los modales. */
  scrim: 'rgba(30, 27, 22, 0.45)',
  /** CTA críticos, FAB de reportar, alertas de perdidos y barras de progreso. */
  mustard: '#E8A33D',
  /** Mostaza presionada. */
  mustardPressed: '#D69536',
  /** Relleno y borde del círculo de búsqueda de una mascota perdida en el mapa. */
  mustard20: 'rgba(232, 163, 61, 0.20)',
  mustard80: 'rgba(232, 163, 61, 0.80)',
  /** Fondo global. */
  cream: '#FFF8F0',
  white: '#FFFFFF',
  /** Blanco translúcido para botones sobre fondo teal. */
  whiteOverlay: 'rgba(255, 255, 255, 0.16)',
  whiteOverlayPressed: 'rgba(255, 255, 255, 0.28)',
  /** Color base de las sombras (teal, no negro). */
  shadow: '#1F7A6C',
  transparent: 'transparent',
} as const;

export const colors = { ...tokens, ...brand } as const;

export type ColorName = keyof typeof colors;
