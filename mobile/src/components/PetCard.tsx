/**
 * Card de una mascota en el listado: foto circular, nombre y raza.
 * Tocarla lleva al perfil de la mascota; mantenerla presionada abre un menú
 * con acciones rápidas (ver `useMenuMascota`).
 *
 * Gestos (react-native-gesture-handler 3 + react-native-reanimated 4):
 * - Mantener presionado 600 ms (`useLongPressGesture`) abre el menú con una
 *   vibración media (`expo-haptics`, el motor de vibración del celular, que
 *   no pide permiso). Mientras el dedo está apoyado la card se achica un
 *   poco con `withSpring` y al soltar vuelve a su tamaño.
 * - Un toque (`useTapGesture`) abre el perfil, como antes.
 * - Se combinan con `useExclusiveGestures(mantener, tocar)`: el toque espera
 *   a que el long press falle, que pasa apenas se levanta el dedo, así que
 *   no se nota demora.
 * - La escala es un shared value que se anima en el hilo de UI. Solo se
 *   vuelve al hilo de JS (`scheduleOnRN`) cuando un gesto se activa, para
 *   navegar o abrir el menú.
 *
 * Alternativa tocable: las tres acciones del menú también están en el perfil
 * de la mascota. Con lector de pantalla, la card ofrece la acción "Más
 * opciones" (`accessibilityActions`).
 */
import { memo } from 'react';
import * as Haptics from 'expo-haptics';
import { type AccessibilityActionEvent, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  useLongPressGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useMenuMascota } from '@/hooks/useMenuMascota';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { Mascota } from '@/types/models';
import { Avatar } from './Avatar';

type Props = {
  mascota: Mascota;
  onPress: (mascota: Mascota) => void;
};

/** Diámetro de la foto dentro de la card. */
const FOTO = 80;
/** Tiempo (ms) que hay que mantener presionado para abrir el menú. */
const DURACION_MANTENER = 600;
/** Escala de la card mientras se mantiene presionada. */
const ESCALA_PRESIONADA = 0.96;

/**
 * Card de una mascota, con toque y long press.
 * @param props.mascota datos a mostrar
 * @param props.onPress se llama con la mascota al tocar la card
 * @returns la card
 */
function PetCardBase({ mascota, onPress }: Props) {
  const { abrirMenu } = useMenuMascota();

  // --- Estado ---
  const escala = useSharedValue(1);

  // --- Handlers ---
  /** Abre el perfil. Corre en el hilo de JS. */
  const abrirPerfil = () => onPress(mascota);

  /** Vibra y abre el menú. Corre en el hilo de JS: se llama con `scheduleOnRN`. */
  const abrirMenuConVibracion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    abrirMenu(mascota);
  };

  /**
   * Acciones del lector de pantalla: "activar" abre el perfil y "más opciones", el menú.
   * @param event acción pedida
   */
  const handleAccion = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'longpress') abrirMenu(mascota);
    else abrirPerfil();
  };

  /** Mantener presionado: achica la card y, a los 600 ms, abre el menú. */
  const mantener = useLongPressGesture({
    minDuration: DURACION_MANTENER,
    onBegin: () => {
      escala.set(withSpring(ESCALA_PRESIONADA));
    },
    onActivate: () => {
      scheduleOnRN(abrirMenuConVibracion);
    },
    onFinalize: () => {
      escala.set(withSpring(1));
    },
  });

  /** Toque: abre el perfil. */
  const tocar = useTapGesture({
    onActivate: () => {
      scheduleOnRN(abrirPerfil);
    },
  });

  const gesto = useExclusiveGestures(mantener, tocar);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ scale: escala.get() }],
  }));

  // --- Render ---
  return (
    <GestureDetector gesture={gesto}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${mascota.nombre}, ${mascota.raza}. Ver perfil`}
        accessibilityHint="Mantené presionado para ver más opciones."
        accessibilityActions={[{ name: 'activate' }, { name: 'longpress', label: 'Más opciones' }]}
        onAccessibilityAction={handleAccion}
        style={[styles.card, estilo]}
      >
        <Avatar foto={mascota.foto} nombre={mascota.nombre} size={FOTO} />
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={1}>
            {mascota.nombre}
          </Text>
          <Text style={styles.raza} numberOfLines={1}>
            {mascota.raza}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}


/** Memoizada: en una lista solo se vuelve a dibujar si cambian sus props. */
export const PetCard = memo(PetCardBase);
// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  nombre: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  raza: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
