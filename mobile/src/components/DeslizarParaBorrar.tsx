/**
 * Envoltorio para deslizar una card hacia la izquierda y mostrar el botón
 * "Eliminar". Lo usan `TurnoCard`, `RegistroCard` y `ProximoRefuerzoCard`.
 *
 * Gestos (react-native-gesture-handler 3 + react-native-reanimated 4, API de hooks):
 * - Es un `usePanGesture` propio y no `ReanimatedSwipeable`, porque el
 *   Swipeable no deja configurar `failOffsetY`: se activaba con 10 px hacia
 *   la derecha (aunque cerrado no hace nada) y un scroll vertical con un poco
 *   de desvío horizontal le robaba el gesto a la lista.
 * - Se activa recién después de 20 px en horizontal (`activeOffsetX`) y falla
 *   si antes se movió 10 px en vertical (`failOffsetY`): así el scroll
 *   vertical de la lista siempre gana cuando el dedo va hacia arriba o abajo.
 * - La card se mueve la mitad que el dedo (`FRICCION`) y nunca más que el
 *   ancho del botón. Al soltar queda abierta si se descubrió el 60 % del
 *   botón o si se tiró rápido hacia la izquierda; si no, vuelve a su lugar.
 * - Funciona igual con una card sola o con muchas: no depende de que la
 *   lista scrollee ni de su altura.
 * - Deslizar no borra: deja a la vista el botón, que pide confirmación.
 *   Con la card abierta, tocarla la cierra.
 * - El botón aparece con `opacity` y `scale` según el progreso, en el hilo de
 *   UI. Al cruzar el umbral vibra una vez (`expo-haptics`, que no pide
 *   permiso): con `useAnimatedReaction` se vuelve al hilo de JS solo en el
 *   cruce, no en cada cuadro.
 *
 * Alternativa tocable: el botón "Eliminar" de los formularios de edición.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';

/** Ancho del botón "Eliminar". */
const ANCHO_ACCION = 96;
/** La card se mueve 1/FRICCION de lo que se mueve el dedo. */
const FRICCION = 2;
/** Fracción del botón que hay que descubrir para que quede abierto al soltar. */
const UMBRAL = 0.6;
/** Distancia horizontal (px) antes de que el swipe se active. */
const ARRANQUE = 20;
/** Distancia vertical (px) que, si llega primero, cancela el swipe y deja scrollear. */
const FALLA_VERTICAL = 10;
/** Velocidad (px/s) de un tirón que abre o cierra aunque no se haya llegado al umbral. */
const VELOCIDAD_TIRON = 800;
/** Escala del botón cuando recién empieza a aparecer. */
const ESCALA_INICIAL = 0.8;
/** Resorte para abrir y cerrar, sin rebote. */
const RESORTE = { damping: 22, stiffness: 220, overshootClamping: true };

type Props = {
  children: ReactNode;
  /** Texto accesible del botón (por ejemplo, "Eliminar turno de Luna"). */
  etiqueta: string;
  /**
   * Se llama al tocar "Eliminar".
   * @param cerrar cierra el swipe (para cuando se cancela o falla)
   */
  onEliminar: (cerrar: () => void) => void;
};

/** Vibración leve al cruzar el umbral. Corre en el hilo de JS. */
function vibrarUmbral() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Card deslizable con la acción de eliminar a la derecha.
 * @param props ver `Props`
 * @returns la card envuelta
 */
export function DeslizarParaBorrar({ children, etiqueta, onEliminar }: Props) {
  /** Corrimiento de la card: 0 cerrada, -ANCHO_ACCION abierta. */
  const x = useSharedValue(0);
  const inicio = useSharedValue(0);
  /** Solo para mostrar la capa que cierra al tocar; el gesto usa `x`. */
  const [abierta, setAbierta] = useState(false);
  /** 0 con la card cerrada, 1 con el botón entero a la vista. */
  const progreso = useDerivedValue(() => Math.min(1, -x.get() / ANCHO_ACCION));

  /** Vuelve la card a su lugar. */
  const cerrar = useCallback(() => {
    x.set(withSpring(0, RESORTE));
    setAbierta(false);
  }, [x]);

  const pan = usePanGesture({
    activeOffsetX: [-ARRANQUE, ARRANQUE],
    failOffsetY: [-FALLA_VERTICAL, FALLA_VERTICAL],
    onBegin: () => {
      inicio.set(x.get());
    },
    onUpdate: (e) => {
      const nuevo = inicio.get() + e.translationX / FRICCION;
      x.set(Math.min(0, Math.max(-ANCHO_ACCION, nuevo)));
    },
    onDeactivate: (e) => {
      const tironIzquierda = e.velocityX < -VELOCIDAD_TIRON;
      const tironDerecha = e.velocityX > VELOCIDAD_TIRON;
      const abrir = tironIzquierda || (!tironDerecha && -x.get() >= ANCHO_ACCION * UMBRAL);
      x.set(withSpring(abrir ? -ANCHO_ACCION : 0, RESORTE));
      scheduleOnRN(setAbierta, abrir);
    },
  });

  const estiloCard = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  // --- Render ---
  return (
    // La sombra va afuera: el contenedor recorta lo que sobresale (overflow hidden).
    <View style={styles.sombra}>
      <View style={styles.contenedor}>
        <View style={styles.fondoAccion}>
          <AccionEliminar progreso={progreso} etiqueta={etiqueta} onPress={() => onEliminar(cerrar)} />
        </View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, estiloCard]}>
            {children}
            {/* Con la card abierta, tocarla la cierra (y no abre lo que tenga adentro). */}
            {abierta && (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={cerrar}
                accessibilityRole="button"
                accessibilityLabel="Cerrar opciones"
              />
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

type AccionProps = {
  /** 0 con la card cerrada, 1 con el botón entero a la vista. */
  progreso: SharedValue<number>;
  etiqueta: string;
  onPress: () => void;
};

/**
 * Botón "Eliminar" que aparece detrás de la card.
 * @param props progreso del swipe, texto accesible y acción
 * @returns el botón
 */
function AccionEliminar({ progreso, etiqueta, onPress }: AccionProps) {
  // Vibra una sola vez cada vez que el progreso pasa el umbral.
  useAnimatedReaction(
    () => progreso.get() >= UMBRAL,
    (paso, antes) => {
      if (paso && antes === false) scheduleOnRN(vibrarUmbral);
    },
  );

  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(progreso.get(), [0, UMBRAL], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progreso.get(), [0, 1], [ESCALA_INICIAL, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.accion, pressed && styles.accionPressed]}
    >
      <Animated.View style={[styles.accionContenido, estilo]}>
        <MaterialIcons name="delete-outline" size={sizes.iconMd} color={colors.error} />
        <Text style={styles.accionTexto}>Eliminar</Text>
      </Animated.View>
    </Pressable>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  sombra: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  contenedor: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  fondoAccion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ANCHO_ACCION,
    // Mismo par de colores que la variante `danger` de PrimaryButton.
    backgroundColor: colors.errorContainer,
  },
  card: {
    // Fondo opaco: tapa el botón mientras la card está cerrada.
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
  },
  accion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionPressed: {
    opacity: 0.7,
  },
  accionContenido: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  accionTexto: {
    ...typography.labelSm,
    color: colors.error,
  },
});
