/**
 * Botón "Ver etiqueta" de una vacuna: una miniatura de la foto de la etiqueta
 * con el texto, con fondo claro, borde y un área táctil de al menos 44x44.
 * Abre la foto en grande (`VisorFoto`). Lo usan la card del historial y la
 * del próximo refuerzo.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { RegistroSanitario } from '@/types/models';
import { VisorFoto } from '../VisorFoto';

/** Alto mínimo del botón: el área táctil recomendada. */
const ALTO_TACTIL = 44;
/** Lado de la miniatura. */
const MINIATURA = 32;

type Props = {
  /** Vacuna con `fotoEtiqueta`. */
  registro: RegistroSanitario;
  /** Color del texto y del borde, para que combine con el fondo de la card. */
  color?: string;
};

/**
 * Botón con la miniatura de la etiqueta.
 * @param props ver `Props`
 * @returns el botón con su visor, o nada si la vacuna no tiene foto
 */
export function VerEtiqueta({ registro, color = colors.primary }: Props) {
  const [visible, setVisible] = useState(false);
  const fuente = fuenteFoto(registro.fotoEtiqueta);
  if (!registro.fotoEtiqueta || !fuente) return null;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ver la etiqueta de ${registro.nombre}`}
        accessibilityHint="Abre la foto de la etiqueta en grande"
        style={({ pressed }) => [styles.boton, { borderColor: color }, pressed && styles.pressed]}
      >
        <Image source={fuente} style={styles.miniatura} contentFit="cover" />
        <Text style={[styles.texto, { color }]}>Ver etiqueta</Text>
        <MaterialIcons name="zoom-in" size={sizes.iconSm} color={color} />
      </Pressable>
      <VisorFoto
        visible={visible}
        foto={registro.fotoEtiqueta}
        titulo={`Etiqueta · ${registro.nombre}`}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: ALTO_TACTIL,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    backgroundColor: colors.surfaceContainerLowest,
  },
  miniatura: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  pressed: {
    opacity: 0.6,
  },
  texto: {
    ...typography.labelMd,
  },
});
