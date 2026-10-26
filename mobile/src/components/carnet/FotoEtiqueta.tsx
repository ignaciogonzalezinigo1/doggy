/**
 * Campo opcional del formulario de vacunas: foto de la etiqueta de la vacuna.
 *
 * Es el sticker que el veterinario pega en la libreta (marca, lote y
 * vencimiento) y sirve como constancia de la aplicación. Sin foto muestra un
 * recuadro punteado para agregarla; al tocarlo se elige entre sacarla con la
 * cámara o elegirla de la galería (`useFototeca`), con recorte apaisado
 * porque las etiquetas son rectangulares. Con foto muestra la vista previa
 * (tocándola se ve grande en `VisorFoto`) y los botones "Cambiar" y "Quitar".
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { useFototeca } from '@/hooks/useFototeca';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import { AvisoPermisoFoto } from '../AvisoPermisoFoto';
import { PrimaryButton } from '../PrimaryButton';
import { VisorFoto } from '../VisorFoto';

type Props = {
  /** Foto actual, o null si no se cargó. */
  foto: string | null;
  /** Recibe la foto nueva, o null al quitarla. */
  onChange: (foto: string | null) => void;
};

/** Relación de aspecto del recorte: las etiquetas son más anchas que altas. */
const ASPECTO: [number, number] = [4, 3];

/**
 * Campo de foto de la etiqueta.
 * @param props foto actual y callback de cambio
 * @returns el recuadro para agregarla o la vista previa con sus acciones
 */
export function FotoEtiqueta({ foto, onChange }: Props) {
  const fototeca = useFototeca({ aspecto: ASPECTO });
  const [visorVisible, setVisorVisible] = useState(false);
  const fuente = fuenteFoto(foto);

  /** Pregunta si sacar la foto o elegirla de la galería y la guarda en el formulario. */
  const handleAgregar = async () => {
    try {
      const uri = await fototeca.pedirFoto();
      if (uri) onChange(uri);
    } catch {
      Alert.alert('No se pudo conseguir la foto', 'Probá de nuevo en unos segundos.');
    }
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>Foto de la etiqueta (opcional)</Text>

      {fuente ? (
        <>
          <Pressable
            onPress={() => setVisorVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver la foto de la etiqueta en grande"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Image source={fuente} style={styles.previa} contentFit="cover" />
            <View style={styles.zoom}>
              <MaterialIcons name="zoom-in" size={sizes.iconSm} color={colors.white} />
            </View>
          </Pressable>
          <View style={styles.acciones}>
            <PrimaryButton
              title="Cambiar"
              icon="photo-camera"
              iconLeft
              variant="tonal"
              size="sm"
              onPress={handleAgregar}
              loading={fototeca.eligiendo}
              style={styles.accion}
            />
            <PrimaryButton
              title="Quitar"
              icon="delete-outline"
              iconLeft
              variant="outline"
              size="sm"
              onPress={() => onChange(null)}
              disabled={fototeca.eligiendo}
              style={styles.accion}
            />
          </View>
          <VisorFoto
            visible={visorVisible}
            foto={foto}
            titulo="Etiqueta de la vacuna"
            onClose={() => setVisorVisible(false)}
          />
        </>
      ) : (
        <Pressable
          onPress={handleAgregar}
          disabled={fototeca.eligiendo}
          accessibilityRole="button"
          accessibilityLabel="Agregar foto de la etiqueta"
          accessibilityHint="Podés sacar una foto o elegir una de tu galería"
          style={({ pressed }) => [styles.vacio, pressed && styles.pressed]}
        >
          <MaterialIcons name="add-a-photo" size={sizes.iconLg} color={colors.tealLight} />
          <Text style={styles.vacioTitulo}>Agregar foto de la etiqueta</Text>
          <Text style={styles.vacioAyuda}>
            Sacale una foto al sticker de la libreta o elegila de tu galería.
          </Text>
        </Pressable>
      )}

      <AvisoPermisoFoto
        fototeca={fototeca}
        motivo="La foto de la etiqueta queda como constancia de la vacuna."
        onFoto={onChange}
        compacto
      />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.base,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  vacio: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  vacioTitulo: {
    ...typography.labelMd,
    color: colors.primary,
  },
  vacioAyuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  previa: {
    width: '100%',
    aspectRatio: ASPECTO[0] / ASPECTO[1],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  zoom: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cameraControl,
  },
  pressed: {
    opacity: 0.85,
  },
  acciones: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    marginTop: spacing.xs,
  },
  accion: {
    flex: 1,
  },
});
