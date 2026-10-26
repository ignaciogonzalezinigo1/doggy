/**
 * Visor de foto a pantalla completa: fondo oscuro, la imagen entera lo más
 * grande que entre en la pantalla (sin recortar), el título arriba a la
 * izquierda y una X para cerrar arriba a la derecha. Se puede abrir por
 * encima de otro modal. Lo usan la etiqueta de una vacuna (carnet y
 * formulario) y la foto de un reporte de Perdidos.
 *
 * Gestos (react-native-gesture-handler 3 + react-native-reanimated 4, API de
 * hooks). El área del gesto es TODA la pantalla:
 * - Pellizcar hace zoom entre 1x y 4x con el foco donde están los dedos (con
 *   `focalX/Y` se corre la imagen para que ese punto quede quieto). Si se
 *   pasa de los límites, al soltar vuelve con un resorte.
 * - Con zoom, arrastrar mueve la foto, limitada para que no se vaya de la
 *   pantalla: pasado el borde se mueve con resistencia y al soltar rebota.
 * - Doble toque: desde 1x hace zoom a 2,5x en el punto tocado; con zoom,
 *   vuelve a 1x centrada. Animado.
 * - Sin zoom, arrastrar hacia abajo (o arriba) la cierra: el fondo se va
 *   aclarando y, si se soltó a más de 150 px, se cierra con una vibración
 *   leve (`expo-haptics`); si no, vuelve a su lugar.
 * - El toque simple no hace nada, para no pisarse con el doble toque.
 *
 * Cómo se combinan: pellizco y arrastre son simultáneos
 * (`useSimultaneousGestures`), así se puede mover con dos dedos mientras se
 * hace zoom. El doble toque compite con ellos (`useCompetingGestures`): gana
 * el primero que se activa y cancela al otro. Un doble toque sin mover el
 * dedo nunca activa el arrastre (necesita moverse 10 px) ni el pellizco
 * (necesita dos dedos), así que gana el toque; si se apoyan dos dedos o se
 * arrastra, se activa el pellizco o el arrastre y el toque se cancela. A
 * diferencia de `useExclusiveGestures`, el arrastre no tiene que esperar a
 * que el doble toque falle, y en iOS el pellizco no queda trabado por el toque.
 *
 * Todo se anima en el hilo de UI con shared values; solo se vuelve al hilo de
 * JS (`scheduleOnRN`) para cerrar. Al abrir el visor o cambiar de foto se resetea todo.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, sizes, spacing, typography } from '@/theme';

/** Zoom mínimo y máximo que queda al soltar el pellizco. */
const ESCALA_MIN = 1;
const ESCALA_MAX = 4;
/** Zoom del doble toque desde 1x. */
const ESCALA_DOBLE_TOQUE = 2.5;
/** Cuánto se puede pasar del zoom mínimo y máximo mientras se pellizca (resistencia). */
const ESCALA_ELASTICA_MIN = 0.8;
const ESCALA_ELASTICA_MAX = 5;
/** Fracción del movimiento que se aplica pasado el borde (efecto goma). */
const RESISTENCIA_BORDE = 0.3;
/** Distancia vertical (px) a partir de la cual soltar el arrastre cierra el visor. */
const UMBRAL_CERRAR = 150;
/** Distancia de arrastre en la que el fondo llega a su opacidad mínima. */
const DISTANCIA_FONDO = UMBRAL_CERRAR * 2;
/** Opacidad mínima del fondo mientras se arrastra para cerrar. */
const OPACIDAD_FONDO_MIN = 0.3;
/** Movimiento (px) antes de que el arrastre se active: menos que esto, puede ser un toque. */
const ARRANQUE_ARRASTRE = 10;
/** Duración de la animación del doble toque. */
const DURACION_DOBLE_TOQUE = 250;
/** Lado del botón de cerrar: el área táctil recomendada. */
const TAMANO_CERRAR = 44;
/** Resorte sin rebote exagerado, para volver a los límites. */
const RESORTE = { damping: 20, stiffness: 200 };

type Props = {
  visible: boolean;
  /** Clave de foto local, URI o null. */
  foto: string | null | undefined;
  /** Texto que se muestra arriba y se lee en accesibilidad (por ejemplo, el nombre). */
  titulo: string;
  onClose: () => void;
};

/**
 * Límite de un desplazamiento: cuánto se puede correr la imagen con un zoom
 * dado sin que se vea fondo de más. Si con ese zoom la imagen entra en la
 * pantalla, el límite es 0 (queda centrada).
 * @param contenido tamaño de la imagen a 1x en ese eje (ya ajustada a la pantalla)
 * @param pantalla tamaño de la pantalla en ese eje
 * @param escala zoom
 * @returns el desplazamiento máximo hacia cada lado
 */
function limite(contenido: number, pantalla: number, escala: number): number {
  'worklet';
  return Math.max(0, (contenido * escala - pantalla) / 2);
}

/**
 * Lleva un valor a [-max, max]; con `resistencia`, lo que se pasa se aplica en parte (efecto goma).
 * @param valor desplazamiento pedido
 * @param max límite
 * @param resistencia fracción de lo que se pasa que se aplica (0 corta en seco)
 * @returns el desplazamiento permitido
 */
function acotar(valor: number, max: number, resistencia = 0): number {
  'worklet';
  if (valor > max) return max + (valor - max) * resistencia;
  if (valor < -max) return -max + (valor + max) * resistencia;
  return valor;
}

/**
 * Modal con la foto en grande, con zoom, arrastre y arrastre para cerrar.
 * @param props ver `Props`
 * @returns el visor, o nada si no hay foto
 */
export function VisorFoto({ visible, foto, titulo, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: ancho, height: alto } = useWindowDimensions();
  const fuente = fuenteFoto(foto);

  // --- Estado ---
  const escala = useSharedValue(1);
  const escalaGuardada = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xGuardada = useSharedValue(0);
  const yGuardada = useSharedValue(0);
  /** Tamaño de la imagen a 1x, ajustada a la pantalla ("contain"). Hasta que carga, la pantalla. */
  const contenidoAncho = useSharedValue(ancho);
  const contenidoAlto = useSharedValue(alto);
  /** true si el arrastre actual es el de cerrar (empezó sin zoom y con un dedo). */
  const cerrando = useSharedValue(false);

  // Al abrir el visor o cambiar de foto, la imagen arranca centrada y sin zoom.
  useEffect(() => {
    escala.set(1);
    escalaGuardada.set(1);
    x.set(0);
    y.set(0);
    xGuardada.set(0);
    yGuardada.set(0);
    cerrando.set(false);
  }, [visible, foto, escala, escalaGuardada, x, y, xGuardada, yGuardada, cerrando]);

  // --- Handlers ---
  /** Vibra y cierra. Corre en el hilo de JS: se llama con `scheduleOnRN`. */
  const cerrarConVibracion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  /**
   * Guarda el tamaño real de la imagen ajustada a la pantalla, para los límites del arrastre.
   * @param anchoFoto ancho original de la foto
   * @param altoFoto alto original de la foto
   */
  const guardarTamano = (anchoFoto: number, altoFoto: number) => {
    if (!anchoFoto || !altoFoto) return;
    const ajuste = Math.min(ancho / anchoFoto, alto / altoFoto);
    contenidoAncho.set(anchoFoto * ajuste);
    contenidoAlto.set(altoFoto * ajuste);
  };

  /**
   * Lleva escala y posición a valores válidos con un resorte (al soltar un gesto).
   * Corre en el hilo de UI.
   */
  const volverALimites = () => {
    'worklet';
    const destino = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala.get()));
    const maxX = limite(contenidoAncho.get(), ancho, destino);
    const maxY = limite(contenidoAlto.get(), alto, destino);
    // Si la escala cambia, la posición se corrige en la misma proporción para no saltar.
    const proporcion = destino / escala.get();
    const destinoX = acotar(x.get() * proporcion, maxX);
    const destinoY = acotar(y.get() * proporcion, maxY);
    escala.set(withSpring(destino, RESORTE));
    x.set(withSpring(destinoX, RESORTE));
    y.set(withSpring(destinoY, RESORTE));
    escalaGuardada.set(destino);
    xGuardada.set(destinoX);
    yGuardada.set(destinoY);
  };

  /** Arrastre: con zoom mueve la foto (con límites); sin zoom, en vertical la cierra. */
  const pan = usePanGesture({
    activeOffsetX: [-ARRANQUE_ARRASTRE, ARRANQUE_ARRASTRE],
    activeOffsetY: [-ARRANQUE_ARRASTRE, ARRANQUE_ARRASTRE],
    onBegin: () => {
      xGuardada.set(x.get());
      yGuardada.set(y.get());
      cerrando.set(escala.get() <= ESCALA_MIN);
    },
    onUpdate: (e) => {
      // Si entra un segundo dedo o hay zoom, deja de ser el arrastre para cerrar.
      if (cerrando.get() && (e.numberOfPointers > 1 || escala.get() > ESCALA_MIN)) {
        cerrando.set(false);
      }
      if (cerrando.get()) {
        y.set(e.translationY);
        return;
      }
      const maxX = limite(contenidoAncho.get(), ancho, escala.get());
      const maxY = limite(contenidoAlto.get(), alto, escala.get());
      x.set(acotar(xGuardada.get() + e.translationX, maxX, RESISTENCIA_BORDE));
      y.set(acotar(yGuardada.get() + e.translationY, maxY, RESISTENCIA_BORDE));
    },
    onDeactivate: (e) => {
      if (cerrando.get()) {
        cerrando.set(false);
        if (Math.abs(e.translationY) > UMBRAL_CERRAR) {
          scheduleOnRN(cerrarConVibracion);
        } else {
          y.set(withSpring(0, RESORTE));
        }
        return;
      }
      volverALimites();
    },
  });

  /** Pellizco: zoom sobre la escala guardada, con el foco entre los dedos. */
  const pinch = usePinchGesture({
    onBegin: () => {
      escalaGuardada.set(escala.get());
      cerrando.set(false);
    },
    onUpdate: (e) => {
      const nueva = Math.min(
        ESCALA_ELASTICA_MAX,
        Math.max(ESCALA_ELASTICA_MIN, escalaGuardada.get() * e.scale),
      );
      // Cuánto creció desde el cuadro anterior: el punto entre los dedos (medido
      // desde el centro de la pantalla) tiene que quedar quieto.
      const factor = nueva / escala.get();
      const dx = (e.focalX - ancho / 2 - x.get()) * (1 - factor);
      const dy = (e.focalY - alto / 2 - y.get()) * (1 - factor);
      x.set(x.get() + dx);
      y.set(y.get() + dy);
      // También se corre la base del arrastre, por si se arrastra a la vez.
      xGuardada.set(xGuardada.get() + dx);
      yGuardada.set(yGuardada.get() + dy);
      escala.set(nueva);
    },
    onDeactivate: () => {
      volverALimites();
    },
  });

  /** Doble toque: zoom a 2,5x en el punto tocado, o vuelta a 1x centrada. */
  const dobleToque = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      const animar = { duration: DURACION_DOBLE_TOQUE };
      if (escala.get() > ESCALA_MIN + 0.01) {
        escala.set(withTiming(ESCALA_MIN, animar));
        x.set(withTiming(0, animar));
        y.set(withTiming(0, animar));
        escalaGuardada.set(ESCALA_MIN);
        xGuardada.set(0);
        yGuardada.set(0);
        return;
      }
      // El punto tocado queda quieto: la imagen se corre hacia afuera de él.
      const factor = ESCALA_DOBLE_TOQUE / ESCALA_MIN;
      const destinoX = acotar(
        (e.x - ancho / 2) * (1 - factor),
        limite(contenidoAncho.get(), ancho, ESCALA_DOBLE_TOQUE),
      );
      const destinoY = acotar(
        (e.y - alto / 2) * (1 - factor),
        limite(contenidoAlto.get(), alto, ESCALA_DOBLE_TOQUE),
      );
      escala.set(withTiming(ESCALA_DOBLE_TOQUE, animar));
      x.set(withTiming(destinoX, animar));
      y.set(withTiming(destinoY, animar));
      escalaGuardada.set(ESCALA_DOBLE_TOQUE);
      xGuardada.set(destinoX);
      yGuardada.set(destinoY);
    },
  });

  const gesto = useCompetingGestures(dobleToque, useSimultaneousGestures(pinch, pan));

  const estiloImagen = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: escala.get() }],
  }));

  // Sin zoom, el fondo se aclara a medida que la foto se aleja del centro.
  const estiloFondo = useAnimatedStyle(() => ({
    opacity:
      escala.get() <= ESCALA_MIN
        ? interpolate(
            Math.abs(y.get()),
            [0, DISTANCIA_FONDO],
            [1, OPACIDAD_FONDO_MIN],
            Extrapolation.CLAMP,
          )
        : 1,
  }));

  if (!fuente) return null;

  // --- Render ---
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* El Modal se dibuja fuera de la raíz de la app: sin su propia raíz, los gestos no responden en Android. */}
      <GestureHandlerRootView style={styles.contenido}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, estiloFondo]} />

        {/* El gesto ocupa toda la pantalla; el contenedor no se transforma, así focalX/Y y x/y se miden siempre igual. */}
        <GestureDetector gesture={gesto}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Animated.Image
              source={fuente}
              style={[styles.imagen, estiloImagen]}
              resizeMode="contain"
              onLoad={(e) => guardarTamano(e.nativeEvent.source.width, e.nativeEvent.source.height)}
              accessibilityLabel={`Foto de ${titulo}`}
              accessibilityHint="Pellizcá para hacer zoom, tocá dos veces para acercar o volver al tamaño original, y sin zoom deslizá hacia abajo para cerrar."
            />
          </View>
        </GestureDetector>

        {/* Por encima del área del gesto: la X siempre se puede tocar, aunque la foto tenga zoom. */}
        <View
          style={[styles.barra, { paddingTop: insets.top + spacing.sm }]}
          pointerEvents="box-none"
        >
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
            style={({ pressed }) => [styles.cerrar, pressed && styles.cerrarPressed]}
          >
            <MaterialIcons name="close" size={sizes.iconMd} color={colors.white} />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  contenido: {
    flex: 1,
  },
  fondo: {
    backgroundColor: colors.visorFondo,
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.containerMargin,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.white,
    flex: 1,
  },
  cerrar: {
    width: TAMANO_CERRAR,
    height: TAMANO_CERRAR,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cameraControl,
  },
  cerrarPressed: {
    opacity: 0.7,
  },
});
