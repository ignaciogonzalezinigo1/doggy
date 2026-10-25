/**
 * Formulario para generar un código de asignación de una mascota (solo para
 * dueños). Se elige el rol con el que va a quedar quien lo acepte (Dueño o
 * Invitado), se genera el código y se comparte con la hoja nativa del sistema.
 * Se muestra dentro de un FormModal.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { Invitacion, Mascota, RolMascota } from '@/types/models';
import { ROLES_MASCOTA, rolMascota } from '@/utils/etiquetas';
import { PrimaryButton } from '../PrimaryButton';

type Props = {
  mascota: Mascota;
};

/**
 * Formulario de código de asignación.
 * @param props.mascota mascota a asignar
 * @returns el selector de rol y, una vez generado, el código con "Compartir"
 */
export function InvitarForm({ mascota }: Props) {
  const { generarInvitacion } = useApp();

  // --- Estado ---
  const [rol, setRol] = useState<RolMascota>('invitado');
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [generando, setGenerando] = useState(false);

  // --- Handlers ---
  /** Genera el código con el rol elegido. */
  const handleGenerar = async () => {
    setGenerando(true);
    try {
      setInvitacion(await generarInvitacion(mascota, rol));
    } catch (e) {
      Alert.alert('No se pudo generar el código', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setGenerando(false);
    }
  };

  /** Abre la hoja de compartir del sistema con el código. */
  const handleCompartir = async () => {
    if (!invitacion) return;
    try {
      await Share.share({
        message:
          `Te invito a ${mascota.nombre} en Doggy como ${rolMascota(invitacion.rol).label.toLowerCase()}. ` +
          `Cargá el código ${invitacion.token} en Perfil → "Tengo un código de asignación".`,
      });
    } catch {
      Alert.alert('No se pudo compartir', 'Probá de nuevo en unos segundos.');
    }
  };

  // --- Render ---
  if (invitacion) {
    return (
      <View style={styles.form}>
        <View style={styles.listo}>
          <MaterialIcons name="check-circle" size={sizes.iconMd} color={colors.primary} />
          <Text style={styles.listoTexto}>
            Código generado para sumar a alguien como{' '}
            <Text style={styles.resaltado}>{rolMascota(invitacion.rol).label.toLowerCase()}</Text> de{' '}
            {mascota.nombre}.
          </Text>
        </View>

        <View style={styles.codigoCaja}>
          <Text style={styles.label}>Código</Text>
          <Text style={styles.codigo} selectable>
            {invitacion.token}
          </Text>
        </View>

        <Text style={styles.ayuda}>
          Es de un solo uso.
        </Text>

        <PrimaryButton title="Compartir código" icon="share" iconLeft onPress={handleCompartir} />
        <PrimaryButton
          title="Generar otro"
          icon="refresh"
          iconLeft
          variant="outline"
          onPress={() => setInvitacion(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>¿Con qué rol se suma a {mascota.nombre}?</Text>
      {ROLES_MASCOTA.map((opcion) => {
        const elegido = rol === opcion.valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => setRol(opcion.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegido }}
            style={({ pressed }) => [styles.opcion, elegido && styles.opcionElegida, pressed && styles.pressed]}
          >
            <MaterialIcons
              name={elegido ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={sizes.iconMd}
              color={elegido ? colors.primary : colors.onSurfaceVariant}
            />
            <View style={styles.opcionTexto}>
              <Text style={styles.opcionTitulo}>{opcion.label}</Text>
              <Text style={styles.opcionDescripcion}>{opcion.descripcion}</Text>
            </View>
          </Pressable>
        );
      })}

      <PrimaryButton
        title="Generar código"
        icon="vpn-key"
        iconLeft
        onPress={handleGenerar}
        loading={generando}
        style={styles.boton}
      />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  opcionElegida: {
    borderColor: colors.primary,
    backgroundColor: colors.tealLight10,
  },
  pressed: {
    opacity: 0.8,
  },
  opcionTexto: {
    flex: 1,
    gap: 2,
  },
  opcionTitulo: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  opcionDescripcion: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  boton: {
    marginTop: spacing.sm,
  },
  listo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  listoTexto: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  resaltado: {
    color: colors.primary,
    fontFamily: typography.labelMd.fontFamily,
  },
  codigoCaja: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: sizes.borderWidth,
    borderColor: colors.outlineVariant,
  },
  codigo: {
    ...typography.headlineMd,
    color: colors.primary,
    letterSpacing: 2,
  },
  ayuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
