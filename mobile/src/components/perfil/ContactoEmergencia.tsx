/**
 * Card de contacto de emergencia del usuario: el teléfono que ve quien
 * escanea el QR de la chapita. Se edita desde "Editar datos personales".
 * Si todavía no lo cargó (cuenta recién creada), en lugar del número invita
 * a agregarlo.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { formatearTelefono } from '@/utils/telefonos';
import type { Usuario } from '@/types/models';

type Props = {
  usuario: Usuario;
};

/**
 * Card del contacto de emergencia.
 * @param props.usuario usuario logueado
 * @returns la card
 */
export function ContactoEmergencia({ usuario }: Props) {
  const telefono = usuario.telefonoEmergencia;
  return (
    <View style={styles.card}>
      <View style={styles.telefono}>
        <View style={styles.icono}>
          <MaterialIcons name="phone-iphone" size={sizes.iconMd - 2} color={colors.primary} />
        </View>
        <View style={styles.textos}>
          {telefono ? (
            <View style={styles.numeroFila}>
              <Text style={styles.numero}>{formatearTelefono(telefono)}</Text>
              <MaterialIcons name="verified" size={sizes.iconSm} color={colors.primary} />
            </View>
          ) : (
            <Text style={styles.sinTelefono}>Todavía no cargaste un teléfono</Text>
          )}
        </View>
        {!!telefono && (
          <View style={styles.principal}>
            <Text style={styles.principalTexto}>Principal</Text>
          </View>
        )}
      </View>
      <View style={styles.nota}>
        <MaterialIcons name="edit" size={16} color={colors.primary} />
        <Text style={styles.notaTexto}>
          {telefono ? 'Editable en ' : 'Agregalo en '}
          <Text style={styles.notaFuerte}>Editar datos personales</Text>
          {telefono ? '' : ' para que puedan avisarte si encuentran a tu perro.'}
        </Text>
      </View>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  telefono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    padding: spacing.stackSm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  icono: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryContainer,
  },
  textos: {
    flex: 1,
  },
  numeroFila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  numero: {
    ...typography.bodyMd,
    fontFamily: typography.headlineLg.fontFamily,
    color: colors.onSurface,
  },
  sinTelefono: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  principal: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  principalTexto: {
    ...typography.labelSm,
    color: colors.primary,
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  notaTexto: {
    ...typography.labelSm,
    fontFamily: typography.bodySm.fontFamily,
    color: colors.onSurfaceVariant,
  },
  notaFuerte: {
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
  },
});
