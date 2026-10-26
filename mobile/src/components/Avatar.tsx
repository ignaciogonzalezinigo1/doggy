/**
 * Avatar circular para mascotas y personas.
 *
 * La foto va con `expo-image`: la guarda en caché (memoria y disco, así una
 * foto del servidor no se vuelve a bajar) y la decodifica al tamaño en que se
 * muestra, no a los 800 px del archivo.
 *
 * Muestra la foto si existe y carga bien. Si no hay foto o falla la carga,
 * dibuja un círculo con la inicial del nombre y una huellita, con los colores
 * de la marca, así ninguna card queda con un hueco vacío.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, sizes, typography } from '@/theme';

type Props = {
  /** Clave de foto local, URI o null. */
  foto: string | null | undefined;
  /** Nombre para la inicial y el texto accesible. */
  nombre: string;
  /** Diámetro en puntos. */
  size?: number;
  /** Color del borde; por defecto un crema suave. */
  borderColor?: string;
};

/**
 * Avatar con foto o, si no hay, la inicial.
 * @param props ver `Props`
 * @returns el círculo con la imagen o el respaldo
 */
export function Avatar({
  foto,
  nombre,
  size = sizes.avatarMd,
  borderColor = colors.surfaceContainerLow,
}: Props) {
  const [falloCarga, setFalloCarga] = useState(false);
  const fuente = fuenteFoto(foto);
  // Tamaño dinámico: es lo único que va inline.
  const dimension = { width: size, height: size, borderColor };

  if (!fuente || falloCarga) {
    const inicial = nombre.trim().charAt(0).toUpperCase() || '?';
    return (
      <View
        style={[styles.base, styles.fallback, dimension]}
        accessibilityLabel={`Foto de ${nombre}`}
      >
        <Text style={[styles.inicial, { fontSize: size * 0.38, lineHeight: size * 0.46 }]}>
          {inicial}
        </Text>
        <MaterialIcons
          name="pets"
          size={Math.max(12, size * 0.2)}
          color={colors.mustard}
          style={styles.huella}
        />
      </View>
    );
  }

  return (
    <Image
      source={fuente}
      style={[styles.base, dimension]}
      contentFit="cover"
      transition={150}
      onError={() => setFalloCarga(true)}
      accessibilityLabel={`Foto de ${nombre}`}
    />
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 2,
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: typography.headlineMd.fontFamily,
    color: colors.onPrimary,
  },
  huella: {
    position: 'absolute',
    bottom: '14%',
    right: '14%',
  },
});
